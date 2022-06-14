function App() {
  // state-ul aplicatiei
  // ********************
  // loading - cand se incarca aplicatia  (in timpul requestului)
  // draggind - detecteaza drag and drop-ul pentru colorare
  // showChart - setam display none pe chart inainte de prima interactiune
  // files - fisierele incarcate
  // chart - obiectul in care stocam chart-ul CanvasJS (librarie de grafice pt JavaScript)
  // confidence - confidence thresholdul
  // resultText - unde afisam textul dupa rezultat (daca are sau nu aritmie pacientul)
  const [loading, setLoading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [showChart, setShowChart] = React.useState(false);

  const [files, setFiles] = React.useState([]);

  const [errors, setErrors] = React.useState([]);

  const [chart, setChart] = React.useState(null);

  const [confidence, setConfidence] = React.useState(0.3);

  const [resultText, setResultText] = React.useState("");

  let dragCounter = 0;

  // folosim asta pentru spinnerul animat de loading
  const [asciiSpinner, setAsciiSpinner] = React.useState("/");
  const spinnerStates = [
    "/",
    "-",
    "\\",
    "|",
    "|",
    "|",
    "\\",
    "-",
    "/",
    "|",
    "|",
    "|",
  ];
  const [spinnerIndex, setSpinnerIndex] = React.useState(0);

  // apelam functia cand se interactioneaza cu inputul de confidence sa setam confidence la valoarea inputului (e.target = input)
  const handleInput = (e) => {
    setConfidence(e.target.value);
  };

  // urmatoarele 3 functii seteaza in state date legate de drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragging(true);
    }
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounter--;
    if (dragCounter === 0) {
      setDragging(false);
    }
  };

  // cand se face drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    // nu facem nimic daca nu exista fisierele (o siguranta)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // preluam din event fisierele
      let _files = Array.from(e.dataTransfer.items);
      _files = _files.map((_) => _.getAsFile());

      // curatam
      e.dataTransfer.clearData();
      dragCounter = 0;

      // apelam metoda care face request folosind fisierele preluate
      postFiles(_files);
    }
  };

  const postFiles = (_files) => {
    // stocam in data fisierele primite
    let data = {};
    let missingFileErrors = [];
    // vom cauta ca cele 3 fisiere sunt prezente
    const fileExtensions = ["dat", "atr", "hea"];
    fileExtensions.forEach((e) => {
      // atribuim in data la proprietatea cu numele extensiei fisierul daca exista
      data[e] = _files.find(
        (_) => _.name.split(".")[_.name.split(".").length - 1] == e
      );
      // daca data[extensie] nu exista, generam o eroare
      if (data[e] === undefined) {
        missingFileErrors.push({ message: `.${e} file is missing` });
      }
    });
    // daca exista erori, le setam (pentru a fi afisate)
    if (missingFileErrors.length > 0) {
      setErrors(missingFileErrors);
      // incheiem procesul
      return;
    }

    // totul a fost ok, golim erorile si setam fisierele (ca sa le afisam numele in interfata)
    setErrors([]);
    setFiles(_files);

    // generam payload-ul ca tip FormData
    let payload = new FormData();

    // atribuim fisierele la proprietatile corespunzatoare
    payload.append("signal", data.dat);
    payload.append("annotation", data.atr);
    payload.append("hea", data.hea);

    setLoading(true);

    // facem request
    fetch("/predict_api", {
      body: payload,
      method: "post",
    })
      .then((response) =>
        // transformam raspunsul in json
        response
          .json()
          .then((data) => ({ status: response.status, body: data }))
      )
      .then((data) => {
        if (data.status === 200) {
          // atribuim datele din raspuns in variabila responseResult
          let responseResult = data.body;
          // preluam din rezultat doar primele 10 batai ale inimii
          responseResult.input = responseResult.input.slice(0, 10);
          responseResult.prediction = responseResult.prediction.slice(0, 10);

          // mai pastram aici niste variabile intermediare
          let secondsPassed = 0;
          // in chartData vom pastra lista de puncte din grafic
          let chartData = [];
          let hasArrhythmia = false;
          // iteram bataile inimii
          for (let i = 0; i < responseResult.input.length; i++) {
            let element = responseResult.input[i];
            let colorItRed = false;

            // gasim punctul maxim al intervalului ca sa punem acolo labelul de normal/abnormal
            const max = Math.max(...element);

            const indexOfMax = element.indexOf(max);
            // iteram toate bucatelele de semnal dintr-un interval de bataie (216 bucati)
            for (let index = 0; index < element.length; index++) {
              const t = element[index];

              // adaugam la datele pt plot: y => valoarea semnalului, x=> axa timpului (numaram din 0.3 secunde)
              let plotData = { y: t, x: secondsPassed };

              // daca punctul e maximul, adaugam label
              if (index === indexOfMax) {
                plotData.indexLabel = "Normal";
              }

              // daca e mai mare ca confidence, a fost detectata aritmie
              // adaugam un label ca anormal, setam hasArrhythmia ca true (pentru mesaj)
              if (
                responseResult.prediction[i][0] > confidence &&
                index === indexOfMax
              ) {
                plotData.indexLabel = "Abnormal";
                plotData.markerColor = "red";
                plotData.markerType = "circle";
                plotData.lineColor = "red";
                plotData.color = "red";
                colorItRed = true;
                hasArrhythmia = true;
              }
              chartData.push(plotData);
              secondsPassed += 0.3;
            }

            // daca a fost detectata aritmie in interval, coloram tot intervalul in rosu
            if (colorItRed) {
              for (let ii = i * 216; ii < (i + 1) * 216; ii++) {
                let pointData = chartData[ii];
                pointData.markerBorderColor = "red";
                pointData.lineColor = "red";
              }
            }
          }

          // in functie de hasArrhythmia afisam un mesaj
          hasArrhythmia
            ? setResultText("Arrhythmia was detected on patient.")
            : setResultText("No arrhythmia was detected.");

          // la final, setam chartData in chart si apelam functia lui de render
          chart.options.data[0].dataPoints = chartData;
          chart.render();
          setShowChart(true);
        }
      })
      // oprim loadingul
      .finally(() => setLoading(false));
  };

  // aici ne ocupam de animatia loading
  React.useEffect(() => {
    if (loading) {
      const intervalID = setTimeout(() => {
        setAsciiSpinner(spinnerStates[spinnerIndex % 12]);
        setSpinnerIndex(spinnerIndex + 1);
      }, 100);

      return () => clearInterval(intervalID);
    }
  });

  // initializam aici obiectul chart din state
  React.useEffect(() => {
    var _chart = new CanvasJS.Chart("chartContainer", {
      animationEnabled: true,
      height: 550, //in pixels
      width: 1500,
      title: {
        text: "Results",
      },
      data: [
        {
          type: "line",
          markerColor: "white",
          markerBorderColor: "blue",
          lineColor: "blue",
          indexLabelFontSize: 16,
          fontFamily: "Montserrat",
          dataPoints: [
            { x: 10, y: 17 },
            { x: 20, y: 15 },
            { x: 30, y: 25 },
            { x: 40, y: 16 },
            { x: 50, y: 29 },
            { x: 60, y: 16 },
            { x: 70, y: 22 },
            { x: 80, y: 23 },
            { x: 90, y: 21 },
          ],
        },
      ],
    });
    setChart(_chart);
    // cand useEffect este apelat cu al doilea argument ca un array gol [], functia noastra se va apela o singura data, la incarcarea paginii
    // de aceea initializam aici chart
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Arrhythmia Detection App</h1>
      </header>
      <main>
        <div
          className={dragging ? "drag-and-drop  dragging" : "drag-and-drop "}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="drag-and-drop__content">
            <h4>Drag and drop the three files (.atr, .dat and .hea) here</h4>
            {
              // asa arata un for in react }
            }
            {files.length > 0 && files.map((_) => <div>{_.name}</div>)}
          </div>
        </div>
        <div>
          <label for="confidence">Confidence threshold: {confidence}</label>
          <input
            type="range"
            name="confidence"
            min="0.01"
            max="1"
            onChange={handleInput}
            step="0.01"
            defaultValue="0.3"
          />
        </div>

        {errors.length > 0 && (
          <div className="errors">
            {errors.map((e) => (
              <div>{e.message}</div>
            ))}
          </div>
        )}
        {
          // daca loading atunci arata asta
        }
        {loading && (
          <div className="loading">
            Loading... <span>{asciiSpinner}</span>
          </div>
        )}
        {
          // chartul initializat va cauta elementul cu id-ul chartContainer sa afiseze acolo plotul
        }
        <div
          id="chartContainer"
          style={{
            display: showChart ? "block" : "none",
            height: 550,
            width: "100%",
            maxWidth: "1500px",
            margin: "0 auto",
            overflowX: "auto",
            paddingBottom: "2rem",
            overflowY: "hidden",
          }}
        ></div>
        <div
          className="result-text"
          style={{
            color:
              resultText.indexOf("No") > -1 ? "var(--accent)" : "var(--red)",
          }}
        >
          {resultText}
        </div>
      </main>
    </div>
  );
}

// in final, cream aplicatia react si o randam
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

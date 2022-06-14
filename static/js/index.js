function App() {
  const [loading, setLoading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [showChart, setShowChart] = React.useState(false);

  const [files, setFiles] = React.useState([]);

  const [errors, setErrors] = React.useState([]);

  const [result, setResult] = React.useState(null);

  const [chart, setChart] = React.useState(null);

  const [confidence, setConfidence] = React.useState(0.2);

  let dragCounter = 0;

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

  const handleInput = (e) => {
    setConfidence(e.target.value);
  };

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
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      let _files = Array.from(e.dataTransfer.items);
      _files = _files.map((_) => _.getAsFile());
      e.dataTransfer.clearData();
      dragCounter = 0;

      postFiles(_files);
    }
  };

  const postFiles = (_files) => {
    let data = {};
    let missingFileErrors = [];
    const fileExtensions = ["dat", "atr", "hea"];
    fileExtensions.forEach((e) => {
      data[e] = _files.find(
        (_) => _.name.split(".")[_.name.split(".").length - 1] == e
      );
      if (data[e] === undefined) {
        missingFileErrors.push({ message: `.${e} file is missing` });
      }
    });
    if (missingFileErrors.length > 0) {
      setErrors(missingFileErrors);
      return;
    }

    setErrors([]);
    setFiles(_files);
    let payload = new FormData();
    payload.append("signal", data.dat);
    payload.append("annotation", data.atr);
    payload.append("hea", data.hea);

    setLoading(true);
    fetch("/predict_api", {
      body: payload,
      method: "post",
    })
      .then((response) =>
        response
          .json()
          .then((data) => ({ status: response.status, body: data }))
      )
      .then((data) => {
        if (data.status === 200) {
          let responseResult = data.body;
          responseResult.input = responseResult.input.slice(0, 10);
          responseResult.prediction = responseResult.prediction.slice(0, 10);
          let reducedInput = [];
          let secondsPassed = 0;
          let chartData = [];
          for (let i = 0; i < responseResult.input.length; i++) {
            let element = responseResult.input[i];
            let colorItRed = false;
            // let average = element.reduce((a, b) => a + b) / element.length;
            // reducedInput.push(average);
            const max = Math.max(...element);

            const indexOfMax = element.indexOf(max);
            for (let index = 0; index < element.length; index++) {
              const t = element[index];
              let plotData = { y: t, x: secondsPassed, lineColor: "red" };
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
              }
              chartData.push(plotData);
              secondsPassed += 0.3;
            }

            if (colorItRed) {
              for (let ii = i * 216; ii < (i + 1) * 216; ii++) {
                let pointData = chartData[ii];
                pointData.markerBorderColor = "red";
                pointData.lineColor = "red";
              }
            }
          }
          responseResult.input = reducedInput;
          chart.options.data[0].dataPoints = chartData;
          chart.render();
          setShowChart(true);
        }
      })
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    if (loading) {
      const intervalID = setTimeout(() => {
        setAsciiSpinner(spinnerStates[spinnerIndex % 12]);
        setSpinnerIndex(spinnerIndex + 1);
      }, 100);

      return () => clearInterval(intervalID);
    }
  });

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
          indexLabelFontSize: 16,
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
            defaultValue="0.2"
          />
        </div>

        {errors.length > 0 && (
          <div className="errors">
            {errors.map((e) => (
              <div>{e.message}</div>
            ))}
          </div>
        )}
        {loading && (
          <div className="loading">
            Loading... <span>{asciiSpinner}</span>
          </div>
        )}
        <div
          id="chartContainer"
          style={{
            display: showChart ? "block" : "none",
            height: 550,
            width: "1500px",
            margin: "0 auto",
            overflowX: "auto",
            paddingBottom: "2rem",
            overflowY: "hidden",
          }}
        ></div>
      </main>
    </div>
  );
}

// instantiem aplicatia React
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

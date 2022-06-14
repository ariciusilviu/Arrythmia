function App() {
  const [loading, setLoading] = React.useState(false);

  const [asciiSpinner, setAsciiSpinner] = React.useState("/");
  const spinnerStates = ["/", "-", "\\", "|"];
  const [spinnerIndex, setSpinnerIndex] = React.useState(0);

  React.useEffect(() => {
    if (loading) {
      const intervalID = setTimeout(() => {
        setAsciiSpinner(spinnerStates[spinnerIndex % 4]);
        setSpinnerIndex(spinnerIndex + 1);
      }, 100);

      return () => clearInterval(intervalID);
    }
  });

  return (
    <div className="App">
      <header className="App-header">
        <h1>Gender and age detection app</h1>
      </header>
      <main>
        <form onSubmit={handleSubmit}>
          <h3>Upload a file and submit it to get started</h3>
          <input type="file" accept="image/jpeg" onChange={handleChange} />
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              maxWidth: "300px",
            }}
          >
            <label for="confidence">Confidence threshold</label>
            <input
              type="range"
              name="confidence"
              min="0.15"
              max="0.99"
              onChange={handleInput}
              step="0.01"
              defaultValue="0.7"
            />
          </div>
          <div>
            Confidence is : <span className="turq">{confidence}</span>
          </div>
          <div>
            <input type="submit" value="Submit image" disabled={!file} />
          </div>
        </form>
        {!loading ? (
          !errorMessage ? (
            file &&
            results != null && (
              <div className="results">
                <div className="results__imgs">
                  <img src={fileToBase64} />
                  <img src={resultBase64} />
                </div>
                <h3 style={{ textAlign: "center" }}>Results:</h3>
                <div className="results__data">
                  {results != null &&
                    results.map((_, index) => (
                      <div key={index}>
                        {_.gender === "Male" ? "👨" : "👩"} Gender:{" "}
                        <span className="turq">{_.gender}</span> Age:{" "}
                        <span className="turq">{_.age}</span>
                      </div>
                    ))}
                </div>
              </div>
            )
          ) : (
            <div className="error">{errorMessage}</div>
          )
        ) : (
          <div>
            Loading... <span className="turq">{asciiSpinner}</span>
          </div>
        )}
        {}
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

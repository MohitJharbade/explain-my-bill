import { useState, useEffect } from "react";

function App() {
  const [status, setStatus] = useState("Checking backend...");
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5001/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.message))
      .catch(() => setStatus("Could not reach backend"));
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("bill", file);

    try {
      const res = await fetch("http://localhost:5001/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploadResult(data);
    } catch (err) {
      setUploadResult({ error: "Upload failed" });
    }
  };

  return (
    <div>
      <h1>Explain My Bill</h1>
      <p>Backend status: {status}</p>

      <hr />

      <h2>Test Upload</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>

      {uploadResult && (
        <pre>{JSON.stringify(uploadResult, null, 2)}</pre>
      )}
    </div>
  );
}

export default App;
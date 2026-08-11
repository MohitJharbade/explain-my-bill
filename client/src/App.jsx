import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

function App() {
  const [status, setStatus] = useState("Checking backend...");
  const [file, setFile] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.message))
      .catch(() => setStatus("Could not reach backend"));
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setLineItems([]);
  };

  const pollJobStatus = (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/status/${jobId}`);
        const data = await res.json();

        if (data.status === "completed") {
          clearInterval(interval);
          setLineItems(data.result.lineItems || []);
          setLoading(false);
        } else if (data.status === "failed") {
          clearInterval(interval);
          alert("Bill processing failed: " + data.error);
          setLoading(false);
        }
        // if "waiting" or "active", just keep polling
      } catch (err) {
        clearInterval(interval);
        alert("Failed to check job status");
        setLoading(false);
      }
   }, 3000); // poll every 3 seconds
  };

  

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("bill", file);

    setLoading(true);
    setLineItems([]);
    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.jobId) {
        pollJobStatus(data.jobId);
      } else {
        alert("Failed to queue bill");
        setLoading(false);
      }
    } catch (err) {
      alert("Upload failed");
      setLoading(false);
    }
  };

  const handleExplain = async (question = null) => {
    if (lineItems.length === 0) {
      alert("No line items to explain yet");
      return;
    }

    setExplaining(true);
    try {
      const res = await fetch(`${API_URL}/api/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems, question }),
      });
      const data = await res.json();
      setExplanation(data);
    } catch (err) {
      alert("Failed to get explanation");
    } finally {
      setExplaining(false);
    }
  };

  const getBillSummary = () => {
    const total = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const categoryTotals = {};
    lineItems.forEach((item) => {
      const cat = item.category || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(item.amount) || 0);
    });

    const flaggedCount = lineItems.filter(
      (item) => item.flags && item.flags.length > 0
    ).length;

    const chartData = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    }));

    return { total, categoryTotals, flaggedCount, chartData };
  };

  const handleExportPDF = () => {
    const { total, categoryTotals, flaggedCount } = getBillSummary();
    const doc = new jsPDF();
    let y = 15;

    doc.setFontSize(16);
    doc.text("Explain My Bill — Summary Report", 10, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Total: $${total.toFixed(2)}`, 10, y);
    y += 7;
    doc.text(`Flagged items: ${flaggedCount}`, 10, y);
    y += 10;

    doc.setFontSize(13);
    doc.text("By Category:", 10, y);
    y += 7;
    doc.setFontSize(11);
    Object.entries(categoryTotals).forEach(([category, amount]) => {
      doc.text(`${category}: $${amount.toFixed(2)}`, 12, y);
      y += 6;
    });

    y += 5;
    doc.setFontSize(13);
    doc.text("Line Items:", 10, y);
    y += 7;
    doc.setFontSize(10);
    lineItems.forEach((item) => {
      const flagText = item.flags && item.flags.length > 0 ? ` [${item.flags.join(", ")}]` : "";
      const line = `${item.description} — $${Number(item.amount).toFixed(2)} (${item.category})${flagText}`;
      const wrapped = doc.splitTextToSize(line, 180);
      doc.text(wrapped, 12, y);
      y += wrapped.length * 5 + 2;
      if (y > 270) {
        doc.addPage();
        y = 15;
      }
    });

    if (explanation) {
      y += 5;
      doc.setFontSize(13);
      doc.text("AI Explanation:", 10, y);
      y += 7;
      doc.setFontSize(10);
      const summaryWrapped = doc.splitTextToSize(explanation.overallSummary || "", 180);
      doc.text(summaryWrapped, 12, y);
      y += summaryWrapped.length * 5 + 5;

      if (explanation.itemExplanations) {
        explanation.itemExplanations.forEach((item) => {
          if (y > 270) {
            doc.addPage();
            y = 15;
          }
          const line = `${item.description}: ${item.explanation}`;
          const wrapped = doc.splitTextToSize(line, 180);
          doc.text(wrapped, 12, y);
          y += wrapped.length * 5 + 3;
        });
      }
    }

    doc.save("bill-summary.pdf");
  };


  const handleItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", amount: 0, category: "Other", flags: [] },
    ]);
  };

  const handleRemoveItem = (index) => {
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
  };

  return (
    <div>
      <header className="site-header">
        <p className="eyebrow">Bill review, plainly explained</p>
        <h1>Explain My Bill</h1>
        <p className="status-line">
          <span className={`status-dot ${status.includes("reachable") ? "status-ok" : ""}`}></span>
          {status}
        </p>
      </header>

      <section className="upload-card">
        <h2>Upload your bill</h2>
        <p className="section-hint">A photo or screenshot works. Nothing is saved after your session.</p>
        <div className="upload-row">
          <label className="file-input">
            <input type="file" onChange={handleFileChange} />
            <span>{file ? file.name : "Choose a file"}</span>
          </label>
          <button className="btn-primary" onClick={handleUpload} disabled={loading}>
            {loading ? "Reading bill…" : "Upload"}
          </button>
        </div>
      </section>

      {lineItems.length > 0 && (
        <>
          <section className="summary-card">
            <h2>Bill summary</h2>
            {(() => {
              const { total, categoryTotals, flaggedCount, chartData } = getBillSummary();
              return (
                <>
                  <div className="summary-stats">
                    <div className="stat">
                      <span className="stat-label">Total</span>
                      <span className="stat-value mono">${total.toFixed(2)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Flagged items</span>
                      <span className={`stat-value mono ${flaggedCount > 0 ? "stat-alert" : ""}`}>
                        {flaggedCount}
                      </span>
                    </div>
                  </div>

                  <p className="section-hint">By category</p>
                  <ul className="category-list">
                    {Object.entries(categoryTotals).map(([category, amount]) => (
                      <li key={category}>
                        <span>{category}</span>
                        <span className="mono">${amount.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>

                  <div style={{ width: "100%", height: 220, marginTop: "20px" }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <XAxis dataKey="category" tick={{ fontSize: 11, fontFamily: "Inter" }} />
                        <YAxis tick={{ fontSize: 11, fontFamily: "Inter" }} />
                        <Tooltip />
                        <Bar dataKey="amount" fill="#2F6E62" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              );
            })()}
          </section>

          <section className="review-section">
            <h2>Review line items</h2>
            <p className="section-hint">Check each item below. Fix anything that looks wrong before asking for an explanation.</p>

          <table className="bill-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Flags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, "description", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) =>
                        handleItemChange(index, "amount", parseFloat(e.target.value))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) =>
                        handleItemChange(index, "category", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    {item.flags && item.flags.length > 0 ? (
                      item.flags.map((flag, i) => (
                        <span
                          key={i}
                          className={`flag-tag ${flag.toLowerCase().includes("duplicate") ? "flag-duplicate" : ""}`}
                        >
                          {flag}
                        </span>
                      ))
                    ) : (
                      <span className="flag-none">—</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-remove" onClick={() => handleRemoveItem(index)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="btn-secondary" onClick={handleAddItem}>
            + Add missing line item
          </button>
          </section>

          <section className="actions-section">
            <h2>Ask about your bill</h2>
            <div className="question-row">
              <button className="btn-primary" onClick={() => handleExplain()} disabled={explaining}>
                {explaining ? "Generating…" : "Explain my bill"}
              </button>
              <button className="btn-ghost" onClick={() => handleExplain("Why is this bill expensive?")} disabled={explaining}>
                Why is this expensive?
              </button>
              <button className="btn-ghost" onClick={() => handleExplain("Summarize my bill in simple terms")} disabled={explaining}>
                Summarize my bill
              </button>
              <button className="btn-ghost" onClick={() => handleExplain("Which charge on this bill looks most suspicious or worth questioning?")} disabled={explaining}>
                Which charge looks suspicious?
              </button>
            </div>

            {explanation && (
              <div className="explanation-panel">
                <p className="margin-note-label">Notes on your bill</p>
                <p className="overall-summary">{explanation.overallSummary}</p>

                {explanation.itemExplanations && explanation.itemExplanations.length > 0 && (
                  <ul className="margin-notes">
                    {explanation.itemExplanations.map((item, index) => (
                      <li key={index}>
                        <span className="margin-note-desc">{item.description}</span>
                        <span className="margin-note-text">{item.explanation}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button className="btn-secondary" onClick={handleExportPDF} style={{ marginTop: "16px" }}>
              Export as PDF
            </button>
          </section>
        </>
      )}
    </div>
  );
}

export default App;
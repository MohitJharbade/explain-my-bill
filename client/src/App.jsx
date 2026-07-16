import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";

function App() {
  const [status, setStatus] = useState("Checking backend...");
  const [file, setFile] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5001/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.message))
      .catch(() => setStatus("Could not reach backend"));
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setLineItems([]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("bill", file);

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5001/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setLineItems(data.lineItems || []);
    } catch (err) {
      alert("Upload failed");
    } finally {
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
      const res = await fetch("http://localhost:5001/api/explain", {
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
      <h1>Explain My Bill</h1>
      <p>Backend status: {status}</p>

      <hr />

      <h2>Upload Bill</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Processing..." : "Upload"}
      </button>

      {lineItems.length > 0 && (
        <>
          <hr />
          <h2>Bill Summary</h2>
          {(() => {
            const { total, categoryTotals, flaggedCount, chartData } = getBillSummary();
            return (
              <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
                <p><strong>Total: ${total.toFixed(2)}</strong></p>
                <p>Flagged items: {flaggedCount}</p>
                <p><strong>By Category:</strong></p>
                <ul>
                  {Object.entries(categoryTotals).map(([category, amount]) => (
                    <li key={category}>
                      {category}: ${amount.toFixed(2)}
                    </li>
                  ))}
                </ul>

                <div style={{ width: "100%", height: 250 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          <hr />
          <h2>Review Line Items</h2>
          <p>Check each item below. Fix anything OCR got wrong before continuing.</p>

          <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
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
                    {item.flags && item.flags.length > 0
                      ? item.flags.join(", ")
                      : "—"}
                  </td>
                  <td>
                    <button onClick={() => handleRemoveItem(index)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleAddItem} style={{ marginTop: "10px" }}>
            + Add missing line item
          </button>

          <br /><br />
          <button onClick={() => handleExplain()} disabled={explaining}>
            {explaining ? "Generating..." : "Explain my bill"}
          </button>{" "}
          <button onClick={() => handleExplain("Why is this bill expensive?")} disabled={explaining}>
            Why is this expensive?
          </button>{" "}
          <button onClick={() => handleExplain("Summarize my bill in simple terms")} disabled={explaining}>
            Summarize my bill
          </button>{" "}
          <button onClick={() => handleExplain("Which charge on this bill looks most suspicious or worth questioning?")} disabled={explaining}>
            Which charge looks suspicious?
          </button>
          
          <br /><br />
          <button onClick={handleExportPDF}>Export as PDF</button>

          {explanation && (
            <div style={{ marginTop: "20px", border: "1px solid #ccc", padding: "15px" }}>
              <h3>Overall Summary</h3>
              <p>{explanation.overallSummary}</p>

              <h3>Item Explanations</h3>
              <ul>
                {explanation.itemExplanations &&
                  explanation.itemExplanations.map((item, index) => (
                    <li key={index}>
                      <strong>{item.description}:</strong> {item.explanation}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          
        </>
      )}
    </div>
  );
}

export default App;
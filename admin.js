document.addEventListener("DOMContentLoaded", function () {
    const root = document.getElementById("admin-root");
  
    const storedFiles = JSON.parse(localStorage.getItem("savedFiles")) || [];
  
    const container = document.createElement("div");
    container.className = "container mt-5";
  
    const title = document.createElement("h2");
    title.className = "text-center mb-4";
    title.innerText = "Admin Panel";
    container.appendChild(title);
  
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "table-responsive";
  
    const table = document.createElement("table");
    table.className = "table table-striped table-bordered";
  
    const thead = document.createElement("thead");
    thead.className = "table-dark";
    thead.innerHTML = `
      <tr>
        <th>File Name</th>
        <th>Download</th>
        <th>Status</th>
      </tr>
    `;
    table.appendChild(thead);
  
    const tbody = document.createElement("tbody");
  
    storedFiles.forEach((file, index) => {
      const row = document.createElement("tr");
  
      const nameCell = document.createElement("td");
      nameCell.innerText = file.name;
  
      const downloadCell = document.createElement("td");
      const downloadBtn = document.createElement("a");
      downloadBtn.href = file.url;
      downloadBtn.download = file.name;
      downloadBtn.className = "btn btn-primary";
      downloadBtn.innerText = "Download";
      downloadCell.appendChild(downloadBtn);
  
      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `badge ${file.isNew ? "bg-success" : "bg-secondary"}`;
      badge.innerText = file.isNew ? "New" : "Old";
      statusCell.appendChild(badge);
  
      row.appendChild(nameCell);
      row.appendChild(downloadCell);
      row.appendChild(statusCell);
  
      tbody.appendChild(row);
    });
  
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
    root.appendChild(container);
  });
  
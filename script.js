document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('tableBody');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sortableHeaders = document.querySelectorAll('.sortable');
    
    // Grab the navigation links for the new sorting buttons
    const longestCavesBtn = document.getElementById('longestCavesBtn');
    const deepestCavesBtn = document.getElementById('deepestCavesBtn');
    
    let allCaves = [];
    let currentData = []; 

    // Default sorting when the page loads
    let currentSortColumn = 'length';
    let currentSortDirection = -1; 

    //
    let isMetric = true; // Global state
    const unitToggleBtn = document.getElementById('unitToggleBtn');

    unitToggleBtn.addEventListener('click', () => {
        isMetric = !isMetric;
        unitToggleBtn.textContent = isMetric ? 'Switch to Imperial (mi/ft)' : 'Switch to Metric (m)';
        renderTable(currentData); // Re-render with new units
    });

    // 1. Fetch the data
    fetch('caves_data.json')
    .then(response => response.json())
    .then(jsonResponse => {
        allCaves = jsonResponse.data;

        // 1. Calculate Length Ranks
        const byLength = [...allCaves].sort((a, b) => (parseFloat(b.length_meters) || 0) - (parseFloat(a.length_meters) || 0));
        byLength.forEach((cave, index) => cave.lengthRank = index + 1);

        // 2. Calculate Depth Ranks
        const byDepth = [...allCaves].sort((a, b) => (parseFloat(b.depth_meters) || 0) - (parseFloat(a.depth_meters) || 0));
        byDepth.forEach((cave, index) => cave.depthRank = index + 1);

        currentData = [...allCaves];
        sortData(currentSortColumn, currentSortDirection);
    })
    .catch(error => console.error('Error loading cave data:', error));

    // 2. Render Table
    function renderTable(dataArray) {
    tableBody.innerHTML = ''; 
    
    dataArray.forEach((cave, index) => {
        const row = document.createElement('tr');
        
        let lengthDisplay = 'N/A';
        let depthDisplay = 'N/A';

        if (cave.length_meters) {
            const meters = parseFloat(cave.length_meters);
            lengthDisplay = isMetric 
                ? `${meters.toLocaleString()} m` 
                : `${(meters * 0.000621371).toFixed(2)} mi`;
        }

        if (cave.depth_meters) {
            const meters = parseFloat(cave.depth_meters);
            depthDisplay = isMetric 
                ? `${meters.toLocaleString()} m` 
                : `${Math.round(meters * 3.28084).toLocaleString()} ft`;
        }
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${cave.cave_name || 'N/A'}</td>
            <td>${cave.country || 'N/A'}</td>
            <td>${cave.state || 'N/A'}</td>
            <td>${cave.county || 'N/A'}</td> 
            <td>${lengthDisplay}</td>
            <td>${depthDisplay}</td>
            <td>${cave.type || 'N/A'}</td>
            <td>${cave.source || 'N/A'}</td>
            <td>${cave.date || 'N/A'}</td>
            <td>${cave.comment || ''}</td>
        `;
        tableBody.appendChild(row);
    });
}

    // 3. Filter Functionality
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            const caveType = e.target.getAttribute('data-type');

            if (caveType === 'All') {
                currentData = [...allCaves];
            } else if (caveType === 'limestone') {
            // Filter for caves where type is null, undefined, or an empty string
            currentData = allCaves.filter(cave => !cave.type || cave.type.trim() === "");
            } else {
                currentData = allCaves.filter(cave => 
                    cave.type && cave.type.toLowerCase() === caveType.toLowerCase()
                );
            }
            
            if (currentSortColumn) {
                sortData(currentSortColumn, currentSortDirection);
            } else {
                renderTable(currentData);
            }
        });
    });

    // 4. Sortable Column Headers
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortColumn = header.getAttribute('data-sort');
            
            if (currentSortColumn === sortColumn) {
                currentSortDirection *= -1; 
            } else {
                currentSortColumn = sortColumn;
                currentSortDirection = 1;
            }
            
            sortData(currentSortColumn, currentSortDirection);
        });
    });

    // 5. Navigation Link Sorting (Longest & Deepest)
    if (longestCavesBtn) {
        longestCavesBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            currentSortColumn = 'length';
            currentSortDirection = -1; 
            sortData(currentSortColumn, currentSortDirection);
        });
    }

    if (deepestCavesBtn) {
        deepestCavesBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            currentSortColumn = 'depth';
            currentSortDirection = -1; 
            sortData(currentSortColumn, currentSortDirection);
        });
    }

    // 6. The actual sorting logic
    function sortData(column, direction) {
        currentData.sort((a, b) => {
            let valA, valB;
            
            if (column === 'name') { valA = (a.cave_name || '').toLowerCase(); valB = (b.cave_name || '').toLowerCase(); }
            else if (column === 'country') { valA = (a.country || '').toLowerCase(); valB = (b.country || '').toLowerCase(); }
            else if (column === 'state') { valA = (a.state || '').toLowerCase(); valB = (b.state || '').toLowerCase(); }
            else if (column === 'county') { valA = (a.county || '').toLowerCase(); valB = (b.county || '').toLowerCase(); }
            else if (column === 'type') { valA = (a.type || '').toLowerCase(); valB = (b.type || '').toLowerCase(); }
            else if (column === 'length') { valA = parseFloat(a.length_meters) || 0; valB = parseFloat(b.length_meters) || 0; }
            else if (column === 'depth') { valA = parseFloat(a.depth_meters) || 0; valB = parseFloat(b.depth_meters) || 0; }
            
            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });
        
        renderTable(currentData);
    }
});
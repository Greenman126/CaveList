document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('tableBody');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sortableHeaders = document.querySelectorAll('.sortable');
    
    const longestCavesBtn = document.getElementById('longestCavesBtn');
    const deepestCavesBtn = document.getElementById('deepestCavesBtn');
    
    let allCaves = [];
    let currentData = []; 

    // Default sorting/ranking state
    let currentSortColumn = 'length';
    let currentSortDirection = -1; 
    let isMetric = true; 

    const unitToggleBtn = document.getElementById('unitToggleBtn');

    unitToggleBtn.addEventListener('click', () => {
        isMetric = !isMetric;
        unitToggleBtn.textContent = isMetric ? 'Switch to Imperial (mi/ft)' : 'Switch to Metric (m)';
        renderTable(currentData); 
    });

    // FIX: This establishes the # column based on the CURRENT filter
    function applyRankings(dataArray, type = 'length') {
        const metric = (type === 'depth') ? 'depth_meters' : 'length_meters';

        // 1. Sort the data by the chosen metric descending to determine rank
        dataArray.sort((a, b) => (parseFloat(b[metric]) || 0) - (parseFloat(a[metric]) || 0));

        // 2. Assign the rank property based on that sorted position
        dataArray.forEach((cave, index) => {
            cave.rank = index + 1;
        });
    }
    
    fetch('caves_data.json')
    .then(response => response.json())
    .then(jsonResponse => {
        allCaves = jsonResponse.data;
        currentData = [...allCaves];
        
        // Initial setup: Rank by length and show
        applyRankings(currentData, 'length');
        sortData('length', -1);
    })
    .catch(error => console.error('Error loading cave data:', error));

    function renderTable(dataArray) {
        tableBody.innerHTML = ''; 
        
        dataArray.forEach((cave) => {
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
                <td>${cave.rank || ''}</td>
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

    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            const caveType = e.target.getAttribute('data-type');

            if (caveType === 'All') {
                currentData = [...allCaves];
            } else if (caveType === 'limestone') {
                currentData = allCaves.filter(cave => !cave.type || cave.type.trim() === "");
            } else {
                currentData = allCaves.filter(cave => 
                    cave.type && cave.type.toLowerCase() === caveType.toLowerCase()
                );
            }
            
            // Re-apply rankings to the NEW filtered set based on current preference
            applyRankings(currentData, currentSortColumn === 'depth' ? 'depth' : 'length');
            renderTable(currentData);
        });
    });

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

    if (longestCavesBtn) {
        longestCavesBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            currentSortColumn = 'length';
            applyRankings(currentData, 'length'); // Rank by Length
            sortData('length', -1);
        });
    }

    if (deepestCavesBtn) {
        deepestCavesBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            currentSortColumn = 'depth';
            applyRankings(currentData, 'depth'); // Rank by Depth
            sortData('depth', -1);
        });
    }

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
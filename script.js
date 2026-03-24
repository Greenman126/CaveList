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

        if (dataArray.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="11" style="text-align:center;">No caves match these criteria.</td></tr>';
            return;
        }
        
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
                <td>${cave.type || '-'}</td>
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
                currentData = allCaves.filter(cave => !cave.type || cave.type.trim() === "" || cave.type.toLowerCase() === "limestone");
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
        // Active class UI logic
        sortableHeaders.forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
        const activeHeader = document.querySelector(`th[data-sort="${column}"]`);
        if (activeHeader) {
            activeHeader.classList.add(direction === 1 ? 'sort-asc' : 'sort-desc');
        }

        let valA, valB;
        
        // Handle Numeric Columns
        if (column === 'length') {
            valA = parseFloat(a.length_meters) || 0;
            valB = parseFloat(b.length_meters) || 0;
            return (valA - valB) * direction;
        } 
        else if (column === 'depth') {
            valA = parseFloat(a.depth_meters) || 0;
            valB = parseFloat(b.depth_meters) || 0;
            return (valA - valB) * direction;
        } 

        // Handle String Columns with localeCompare
        const stringColumns = {
            name: 'cave_name',
            country: 'country',
            state: 'state',
            county: 'county',
            type: 'type'
        };

        const field = stringColumns[column];
        valA = (a[field] || '').toLowerCase();
        valB = (b[field] || '').toLowerCase();

        // sensitivity: 'accent' ensures Š is treated as S, 
        // but you can leave it default for standard dictionary sorting.
        return valA.localeCompare(valB, undefined, { sensitivity: 'accent' }) * direction;
    });

    renderTable(currentData);
}

    const searchInput = document.getElementById('searchInput');
    // search listener
    if (searchInput) {
         searchInput.addEventListener('input', (e) => {
        // Normalize the search term: lowercase and remove accents
        const term = e.target.value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        
        const filtered = currentData.filter(cave => {
            // Helper to normalize cave data fields for comparison
            const prepare = (str) => (str || '')
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            const name = prepare(cave.cave_name);
            const country = prepare(cave.country);
            const state = prepare(cave.state); 
            
            return name.includes(term) || country.includes(term) || state.includes(term);
        });
        
        renderTable(filtered);
    });
}


});
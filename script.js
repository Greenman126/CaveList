document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('tableBody');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sortableHeaders = document.querySelectorAll('.sortable');
    
    let allCaves = [];
    let currentData = []; // Keeps track of currently filtered data for sorting



    let currentSortColumn = 'length';
    let currentSortDirection = -1; // 1 for ascending, -1 for descending

    // 1. Fetch the data
    fetch('caves_data.json')
        .then(response => response.json())
        .then(jsonResponse => {
            allCaves = jsonResponse.data; 
            currentData = [...allCaves];
            sortData(currentSortColumn, currentSortDirection);
        })
        .catch(error => console.error('Error loading cave data:', error));

    // 2. Render Table
    function renderTable(dataArray) {
        tableBody.innerHTML = ''; 
        
        dataArray.forEach((cave, index) => {
            const row = document.createElement('tr');
            
            const lengthDisplay = cave.length_meters ? `${cave.length_meters} m` : 'N/A';
            const depthDisplay = cave.depth_meters ? `${cave.depth_meters} m` : 'N/A';
            
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

    // 3. Filter Functionality (Updated for 'type')
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            const caveType = e.target.getAttribute('data-type');

            if (caveType === 'All') {
                currentData = [...allCaves];
            } else {
                currentData = allCaves.filter(cave => 
                    cave.type && cave.type.toLowerCase() === caveType.toLowerCase()
                );
            }
            
            // Apply sorting if a column has already been sorted
            if (currentSortColumn) {
                sortData(currentSortColumn, currentSortDirection);
            } else {
                renderTable(currentData);
            }
        });
    });

    // 4. Sort Functionality (New!)
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortColumn = header.getAttribute('data-sort');
            
            // Toggle direction if clicking the same column, otherwise default ascending
            if (currentSortColumn === sortColumn) {
                currentSortDirection *= -1; 
            } else {
                currentSortColumn = sortColumn;
                currentSortDirection = 1;
            }
            
            sortData(currentSortColumn, currentSortDirection);
        });
    });

    function sortData(column, direction) {
        currentData.sort((a, b) => {
            let valA, valB;
            
            // Determine what values to compare based on the column
            if (column === 'name') { valA = (a.cave_name || '').toLowerCase(); valB = (b.cave_name || '').toLowerCase(); }
            else if (column === 'country') { valA = (a.country || '').toLowerCase(); valB = (b.country || '').toLowerCase(); }
            else if (column === 'state') { valA = (a.state || '').toLowerCase(); valB = (b.state || '').toLowerCase(); }
            else if (column === 'county') { valA = (a.county || '').toLowerCase(); valB = (b.county || '').toLowerCase(); }
            else if (column === 'type') { valA = (a.type || '').toLowerCase(); valB = (b.type || '').toLowerCase(); }
            // For length and depth, compare numerically
            else if (column === 'length') { valA = parseFloat(a.length_meters) || 0; valB = parseFloat(b.length_meters) || 0; }
            else if (column === 'depth') { valA = parseFloat(a.depth_meters) || 0; valB = parseFloat(b.depth_meters) || 0; }
            
            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });
        
        renderTable(currentData);
    }
});
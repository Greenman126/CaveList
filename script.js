document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('tableBody');
    const filterButtons = document.querySelectorAll('.filter-btn');
    let allCaves = [];

    // 1. Fetch the data from your caves_data.json file
    fetch('caves_data.json')
        .then(response => response.json())
        .then(jsonResponse => {
            // Your array of caves is inside the "data" property
            allCaves = jsonResponse.data; 
            renderTable(allCaves); // Initial render
        })
        .catch(error => console.error('Error loading cave data:', error));

    // 2. Function to render the table based on the dataset provided
    function renderTable(dataArray) {
        tableBody.innerHTML = ''; // Clear existing rows
        
        dataArray.forEach((cave, index) => {
            const row = document.createElement('tr');
            
            // Format length and depth to include "m" if they exist
            const lengthDisplay = cave.length_meters ? `${cave.length_meters} m` : 'N/A';
            const depthDisplay = cave.depth_meters ? `${cave.depth_meters} m` : 'N/A';
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${cave.cave_name || 'N/A'}</td>
                <td>${cave.country || 'N/A'}</td>
                <td>${cave.state || 'N/A'}</td>
                <td>${lengthDisplay}</td>
                <td>${depthDisplay}</td>
                <td>${cave.type || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // 3. Add Filter Functionality
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove 'active' class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add 'active' class to the clicked button
            e.target.classList.add('active');

            const terrainType = e.target.getAttribute('data-terrain');

            if (terrainType === 'All') {
                renderTable(allCaves);
            } else {
                // Filter caves matching the selected type
                const filteredCaves = allCaves.filter(cave => 
                    cave.type && cave.type.toLowerCase() === terrainType.toLowerCase()
                );
                renderTable(filteredCaves);
            }
        });
    });
});

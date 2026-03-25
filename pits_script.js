document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const tableBody = document.getElementById('tableBody');
    const sortableHeaders = document.querySelectorAll('.sortable');
    const unitToggleBtn = document.getElementById('unitToggleBtn');
    const searchInput = document.getElementById('searchInput');
    const perPageSelect = document.getElementById('perPageSelect');
    const paginationControls = document.getElementById('paginationControls');

    // --- State Management ---
    let allPits = [];
    let state = {
        searchTerm: '',
        sortColumn: 'Meters',
        sortDirection: -1,
        isMetric: true,
        currentPage: 1,      
        itemsPerPage: 100    
    };

    // --- Helpers ---
    const normalize = (str) => 
        (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const parseNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? -Infinity : n;
    };

    // --- Core Logic ---
    const processData = () => {
        let pipelineData = [...allPits];

        pipelineData = pipelineData.filter(pit => {
            const depth = parseNum(pit.Meters);
            return depth >= 250;
        });


        // STEP 1: Search Filter
        if (state.searchTerm) {
            pipelineData = pipelineData.filter(pit => {
                return [pit.Cave, pit.Name, pit.Country, pit.State, pit.County].some(field => 
                    normalize(field).includes(state.searchTerm)
                );
            });
        }

        // STEP 2: Calculate Global Rank based strictly on Meters (Depth)
        // (Because the raw JSON data has US pits and Global pits separated)
        const rankedData = [...allPits].sort((a, b) => parseNum(b.Meters) - parseNum(a.Meters));
        const rankMap = new Map();
        rankedData.forEach((pit, index) => rankMap.set(pit.Cave + pit.Name, index + 1));
        
        pipelineData.forEach(pit => pit.rank = rankMap.get(pit.Cave + pit.Name));

        // STEP 3: User UI Sort
        pipelineData.sort((a, b) => {
            const valA = a[state.sortColumn];
            const valB = b[state.sortColumn];

            if (state.sortColumn === 'Meters') {
                return (parseNum(valA) - parseNum(valB)) * state.sortDirection;
            }
            return String(valA || '').localeCompare(String(valB || ''), undefined, { sensitivity: 'accent' }) * state.sortDirection;
        });

        // STEP 4: Pagination
        const totalItems = pipelineData.length;
        let totalPages = state.itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / state.itemsPerPage);
        
        if (state.currentPage > totalPages && totalPages > 0) {
            state.currentPage = totalPages;
        }

        let paginatedData = pipelineData;
        if (state.itemsPerPage !== 'all') {
            const startIndex = (state.currentPage - 1) * state.itemsPerPage;
            const endIndex = startIndex + state.itemsPerPage;
            paginatedData = pipelineData.slice(startIndex, endIndex);
        }

        // STEP 5: Render
        render(paginatedData);
        renderPagination(totalItems, totalPages);
    };

    const render = (data) => {
        tableBody.innerHTML = data.length ? '' : '<tr><td colspan="11" style="text-align:center;">No matching pits found.</td></tr>';
        
        data.forEach(pit => {
            const mDep = parseFloat(pit.Meters);
            
            // Format depth for Metric vs Imperial
            const depDisp = mDep ? (state.isMetric ? `${mDep.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})} m` : `${Math.round(mDep * 3.28084).toLocaleString()} ft`) : 'N/A';

            const row = `
                <tr>
                    <td><strong>${pit.rank || '-'}</strong></td>
                    <td>${pit.Cave || 'N/A'}</td>
                    <td>${pit.Name || '-'}</td>
                    <td>${depDisp}</td>
                    <td>${pit.Country || 'N/A'}</td>
                    <td>${pit.State || 'N/A'}</td>
                    <td>${pit.County || 'N/A'}</td> 
                    <td>${pit.Freefall || '-'}</td>
                    <td>${pit.Source || 'N/A'}</td>
                    <td>${pit.Updated || '-'}</td>
                    <td>${pit.Comment || ''}</td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    // Render Pagination Controls
    const renderPagination = (totalItems, totalPages) => {
        paginationControls.innerHTML = '';
        
        if (totalItems === 0 || totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.className = 'page-btn';
        prevBtn.disabled = state.currentPage === 1;
        prevBtn.addEventListener('click', () => {
            state.currentPage--;
            processData();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        paginationControls.appendChild(prevBtn);

        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
        paginationControls.appendChild(pageInfo);

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.className = 'page-btn';
        nextBtn.disabled = state.currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            state.currentPage++;
            processData();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        paginationControls.appendChild(nextBtn);
    };

    // --- Event Handlers ---

    fetch('pits_data.json')
        .then(res => res.json())
        .then(json => {
            allPits = json.data;
            processData();
        })
        .catch(err => console.error('Error loading pits data:', err));

    perPageSelect?.addEventListener('change', (e) => {
        const val = e.target.value;
        state.itemsPerPage = val === 'all' ? 'all' : parseInt(val, 10);
        state.currentPage = 1; 
        processData();
    });

    searchInput?.addEventListener('input', (e) => {
        state.searchTerm = normalize(e.target.value);
        state.currentPage = 1; 
        processData();
    });

    const updateSortUI = (column) => {
        sortableHeaders.forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
            if (h.getAttribute('data-sort') === column) {
                h.classList.add(state.sortDirection === 1 ? 'sort-asc' : 'sort-desc');
            }
        });
    };

    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const col = header.getAttribute('data-sort');
            state.sortDirection = (state.sortColumn === col) ? state.sortDirection * -1 : 1;
            state.sortColumn = col;
            state.currentPage = 1; 
            updateSortUI(col);
            processData();
        });
    });

    unitToggleBtn.addEventListener('click', () => {
        state.isMetric = !state.isMetric;
        unitToggleBtn.textContent = state.isMetric ? 'Switch to Imperial (ft)' : 'Switch to Metric (m)';
        processData();
    });
});
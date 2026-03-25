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

    const highlightActiveLink = () => {
        let path = window.location.pathname;
        let page = path.split("/").pop() || "index.html";
        document.querySelectorAll('header nav a').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === page);
        });
    };

    // --- Core Logic ---
    const processData = () => {
        // Start with a fresh copy
        let pipelineData = [...allPits];

        // 1. DEPTH GATEKEEPER
        // Only show pits deeper than 250m for the worldwide list
        pipelineData = pipelineData.filter(pit => {
            const depth = parseNum(pit.Meters);
            return depth >= 250;
        });

        // 2. SEARCH FILTER
        if (state.searchTerm) {
            pipelineData = pipelineData.filter(pit => {
                return [pit.Cave, pit.Name, pit.Country, pit.State, pit.County].some(field => 
                    normalize(field).includes(state.searchTerm)
                );
            });
        }

        // 3. DYNAMIC RANKING 
        pipelineData.sort((a, b) => parseNum(b.Meters) - parseNum(a.Meters));
        pipelineData.forEach((pit, index) => {
            pit.rank = index + 1;
        });

        // 4. USER UI SORT
        if (state.sortColumn !== 'Meters') {
            pipelineData.sort((a, b) => {
                const valA = a[state.sortColumn];
                const valB = b[state.sortColumn];
                if (typeof valA === 'number' || !isNaN(parseFloat(valA))) {
                    return (parseNum(valA) - parseNum(valB)) * state.sortDirection;
                }
                return String(valA || '').localeCompare(String(valB || ''), undefined, { sensitivity: 'accent' }) * state.sortDirection;
            });
        }

        // 5. PAGINATION
        const totalItems = pipelineData.length;
        let totalPages = state.itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / state.itemsPerPage);
        if (state.currentPage > totalPages && totalPages > 0) state.currentPage = totalPages;

        let paginatedData = pipelineData;
        if (state.itemsPerPage !== 'all') {
            const startIndex = (state.currentPage - 1) * state.itemsPerPage;
            paginatedData = pipelineData.slice(startIndex, startIndex + state.itemsPerPage);
        }

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
                    <td class="measure-cell primary-metric">${depDisp}</td>
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

    // --- Listeners & Initialization ---
    const renderPagination = (totalItems, totalPages) => {
        paginationControls.innerHTML = '';
        if (totalItems === 0 || totalPages <= 1) return;

        const createBtn = (text, disabled, onClick) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.className = 'page-btn';
            btn.disabled = disabled;
            btn.addEventListener('click', onClick);
            return btn;
        };

        paginationControls.appendChild(createBtn('Previous', state.currentPage === 1, () => {
            state.currentPage--; processData(); window.scrollTo({ top: 0, behavior: 'smooth' });
        }));

        const info = document.createElement('span');
        info.className = 'page-info';
        info.textContent = `Page ${state.currentPage} of ${totalPages}`;
        paginationControls.appendChild(info);

        paginationControls.appendChild(createBtn('Next', state.currentPage === totalPages, () => {
            state.currentPage++; processData(); window.scrollTo({ top: 0, behavior: 'smooth' });
        }));
    };

    fetch('pits_data.json')
        .then(res => res.json())
        .then(json => {
            allPits = json.data;
            highlightActiveLink();
            processData();
        })
        .catch(err => console.error('Error loading pits data:', err));

    perPageSelect?.addEventListener('change', (e) => {
        state.itemsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
        state.currentPage = 1; 
        processData();
    });

    searchInput?.addEventListener('input', (e) => {
        state.searchTerm = normalize(e.target.value);
        state.currentPage = 1; 
        processData();
    });

    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const col = header.getAttribute('data-sort');
            state.sortDirection = (state.sortColumn === col) ? state.sortDirection * -1 : 1;
            state.sortColumn = col;
            state.currentPage = 1; 
            
            sortableHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            header.classList.add(state.sortDirection === 1 ? 'sort-asc' : 'sort-desc');
            processData();
        });
    });

    unitToggleBtn.addEventListener('click', () => {
        state.isMetric = !state.isMetric;
        unitToggleBtn.textContent = state.isMetric ? 'Switch to Imperial (ft)' : 'Switch to Metric (m)';
        processData();
    });
});
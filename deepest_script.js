document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const tableBody = document.getElementById('tableBody');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sortableHeaders = document.querySelectorAll('.sortable');
    const unitToggleBtn = document.getElementById('unitToggleBtn');
    const searchInput = document.getElementById('searchInput');
    const longestCavesBtn = document.getElementById('longestCavesBtn');
    const deepestCavesBtn = document.getElementById('deepestCavesBtn');
    // NEW Elements
    const perPageSelect = document.getElementById('perPageSelect');
    const paginationControls = document.getElementById('paginationControls');

    // --- State Management ---
    let allCaves = [];
    let state = {
        searchTerm: '',
        activeFilter: 'all', 
        sortColumn: 'depth',     // Set to depth
        sortDirection: -1,
        rankColumn: 'depth',     // Set to depth
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
        // STEP 1: Type/Category Filter
        let pipelineData = allCaves.filter(cave => {
            const caveType = (cave.type || '').toLowerCase();
            return state.activeFilter === 'all' || 
                (state.activeFilter === 'limestone' ? (!caveType || caveType === 'limestone') : caveType === state.activeFilter);
        });

        // STEP 2: Rank the dataset
        const rankKey = state.rankColumn === 'length' ? 'length_meters' : 'depth_meters';
        pipelineData.sort((a, b) => parseNum(b[rankKey]) - parseNum(a[rankKey]));
        pipelineData.forEach((cave, index) => cave.rank = index + 1);

        // STEP 3: Search Filter
        if (state.searchTerm) {
            pipelineData = pipelineData.filter(cave => {
                return [cave.cave_name, cave.country, cave.state].some(field => 
                    normalize(field).includes(state.searchTerm)
                );
            });
        }

        // STEP 4: User UI Sort
        const mapping = { name: 'cave_name', length: 'length_meters', depth: 'depth_meters' };
        const sortKey = mapping[state.sortColumn] || state.sortColumn;

        pipelineData.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];

            if (state.sortColumn === 'length' || state.sortColumn === 'depth') {
                return (parseNum(valA) - parseNum(valB)) * state.sortDirection;
            }
            return String(valA || '').localeCompare(String(valB || ''), undefined, { sensitivity: 'accent' }) * state.sortDirection;
        });

        // STEP 5: Pagination (NEW)
        const totalItems = pipelineData.length;
        let totalPages = state.itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / state.itemsPerPage);
        
        // Safety check if current page exceeds total pages after filtering
        if (state.currentPage > totalPages && totalPages > 0) {
            state.currentPage = totalPages;
        }

        let paginatedData = pipelineData;
        if (state.itemsPerPage !== 'all') {
            const startIndex = (state.currentPage - 1) * state.itemsPerPage;
            const endIndex = startIndex + state.itemsPerPage;
            paginatedData = pipelineData.slice(startIndex, endIndex);
        }

        // STEP 6: Render
        render(paginatedData);
        renderPagination(totalItems, totalPages); // NEW
    };

    const render = (data) => {
        tableBody.innerHTML = data.length ? '' : '<tr><td colspan="11" style="text-align:center;">No matching caves found.</td></tr>';
        
        data.forEach(cave => {
            const mLen = parseFloat(cave.length_meters);
            const mDep = parseFloat(cave.depth_meters);

            const lenDisp = mLen ? (state.isMetric ? `${mLen.toLocaleString()} m` : `${(mLen * 0.000621371).toFixed(2)} mi`) : 'N/A';
            const depDisp = mDep ? (state.isMetric ? `${mDep.toLocaleString()} m` : `${Math.round(mDep * 3.28084).toLocaleString()} ft`) : 'N/A';

            const row = `
                <tr>
                    <td>${cave.rank}</td>
                    <td>${cave.cave_name || 'N/A'}</td>
                    <td>${cave.country || 'N/A'}</td>
                    <td>${cave.state || 'N/A'}</td>
                    <td>${cave.county || 'N/A'}</td> 
                    <td>${lenDisp}</td>
                    <td>${depDisp}</td>
                    <td>${cave.type || '-'}</td>
                    <td>${cave.source || 'N/A'}</td>
                    <td>${cave.date || 'N/A'}</td>
                    <td>${cave.comment || ''}</td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    // NEW: Render Pagination Controls
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
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Optional: scroll to top
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
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Optional: scroll to top
        });
        paginationControls.appendChild(nextBtn);
    };

    // --- Event Handlers ---

    fetch('caves_data.json')
        .then(res => res.json())
        .then(json => {
            allCaves = json.data;
            processData();
        })
        .catch(err => console.error('Error loading cave data:', err));

    // NEW: Items per page selector listener
    perPageSelect?.addEventListener('change', (e) => {
        const val = e.target.value;
        state.itemsPerPage = val === 'all' ? 'all' : parseInt(val, 10);
        state.currentPage = 1; // Reset to page 1 on change
        processData();
    });

    searchInput?.addEventListener('input', (e) => {
        state.searchTerm = normalize(e.target.value);
        state.currentPage = 1; // Reset page on search
        processData();
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeFilter = btn.getAttribute('data-type').toLowerCase();
            state.currentPage = 1; // Reset page on filter change
            processData();
        });
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
            state.currentPage = 1; // Reset page on sort
            updateSortUI(col);
            processData();
        });
    });

    unitToggleBtn.addEventListener('click', () => {
        state.isMetric = !state.isMetric;
        unitToggleBtn.textContent = state.isMetric ? 'Switch to Imperial (mi/ft)' : 'Switch to Metric (m)';
        processData();
    });
});
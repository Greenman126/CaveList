document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('tableBody');
    const sortableHeaders = document.querySelectorAll('.sortable');
    const unitToggleBtn = document.getElementById('unitToggleBtn');
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const perPageSelect = document.getElementById('perPageSelect');
    const paginationControls = document.getElementById('paginationControls');

    let allCaves = [];
    let state = {
        searchTerm: '',
        activeFilter: 'all',
        sortColumn: 'depth',     // Default to depth
        sortDirection: -1,
        rankColumn: 'depth',     // Default to depth
        isMetric: true,
        currentPage: 1,      
        itemsPerPage: 100    
    };

    const normalize = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const parseNum = (val) => { const n = parseFloat(val); return isNaN(n) ? -Infinity : n; };

    const highlightActiveLink = () => {
        let path = window.location.pathname;
        let page = path.split("/").pop() || "index.html";
        document.querySelectorAll('header nav a').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === page);
        });
    };

    const processData = () => {
        let pipelineData = [...allCaves];

        if (state.activeFilter !== 'all') {
            pipelineData = pipelineData.filter(cave => {
                const caveType = (cave.type || '').toLowerCase();
                if (state.activeFilter === 'limestone') return !caveType || caveType === 'limestone';
                return caveType === state.activeFilter;
            });
        }

        if (state.searchTerm) {
            pipelineData = pipelineData.filter(cave => {
                return [cave.cave_name, cave.country, cave.state, cave.county].some(field => 
                    normalize(field).includes(state.searchTerm)
                );
            });
        }

        const rankKey = state.rankColumn === 'length' ? 'length_meters' : 'depth_meters';
        pipelineData.sort((a, b) => parseNum(b[rankKey]) - parseNum(a[rankKey]));
        pipelineData.forEach((cave, index) => cave.rank = index + 1);

        const mapping = { name: 'cave_name', length: 'length_meters', depth: 'depth_meters' };
        const sortKey = mapping[state.sortColumn] || state.sortColumn;

        if (state.sortColumn !== state.rankColumn) {
            pipelineData.sort((a, b) => {
                const valA = a[sortKey];
                const valB = b[sortKey];
                if (typeof valA === 'number' || !isNaN(parseFloat(valA))) {
                    return (parseNum(valA) - parseNum(valB)) * state.sortDirection;
                }
                return String(valA || '').localeCompare(String(valB || ''), undefined, { sensitivity: 'accent' }) * state.sortDirection;
            });
        }

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
        tableBody.innerHTML = data.length ? '' : '<tr><td colspan="11" style="text-align:center;">No matching caves found.</td></tr>';
        
        data.forEach(cave => {
            const mLen = parseFloat(cave.length_meters);
            const mDep = parseFloat(cave.depth_meters);
            const lenDisp = mLen ? (state.isMetric ? `${mLen.toLocaleString()} m` : `${(mLen * 0.000621371).toFixed(2)} mi`) : 'N/A';
            const depDisp = mDep ? (state.isMetric ? `${mDep.toLocaleString()} m` : `${Math.round(mDep * 3.28084).toLocaleString()} ft`) : 'N/A';

            const row = `<tr>
                <td><strong>${cave.rank}</strong></td>
                <td>${cave.cave_name || 'N/A'}</td>
                <td>${cave.country || 'N/A'}</td>
                <td>${cave.state || 'N/A'}</td>
                <td>${cave.county || 'N/A'}</td> 
                <td class="measure-cell ${state.rankColumn === 'length' ? 'primary-metric' : ''}">${lenDisp}</td>
                <td class="measure-cell ${state.rankColumn === 'depth' ? 'primary-metric' : ''}">${depDisp}</td>
                <td>${cave.type || '-'}</td>
                <td>${cave.source || 'N/A'}</td>
                <td>${cave.date || 'N/A'}</td>
                <td>${cave.comment || ''}</td>
            </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    };

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

    fetch('caves_data.json').then(res => res.json()).then(json => {
        allCaves = json.data; highlightActiveLink(); processData();
    }).catch(err => console.error('Error:', err));

    searchInput?.addEventListener('input', (e) => { state.searchTerm = normalize(e.target.value); state.currentPage = 1; processData(); });
    perPageSelect?.addEventListener('change', (e) => { state.itemsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value); state.currentPage = 1; processData(); });
    
    unitToggleBtn?.addEventListener('click', () => {
        state.isMetric = !state.isMetric;
        unitToggleBtn.textContent = state.isMetric ? 'Switch to Imperial (mi/ft)' : 'Switch to Metric (m)';
        processData();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeFilter = (btn.getAttribute('data-type') || 'all').toLowerCase();
            state.currentPage = 1; 
            processData();
        });
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
});
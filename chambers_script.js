document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('tableBody');
    const sortableHeaders = document.querySelectorAll('.sortable');
    const unitToggleBtn = document.getElementById('unitToggleBtn');
    const searchInput = document.getElementById('searchInput');
    const perPageSelect = document.getElementById('perPageSelect');
    const paginationControls = document.getElementById('paginationControls');

    let allChambers = [];
    let state = {
        searchTerm: '',
        sortColumn: 'area_m2',
        sortDirection: -1,
        isMetric: true,
        currentPage: 1,      
        itemsPerPage: 100    
    };

    const normalize = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const formatNum = (num, type) => {
        if (num === null || num === undefined || isNaN(num)) return '-';
        if (!state.isMetric) {
            if (type === 'area') return (num * 10.7639).toLocaleString(undefined, {maximumFractionDigits: 0}) + ' ft²';
            if (type === 'vol') return (num * 35.3147).toLocaleString(undefined, {maximumFractionDigits: 2}) + ' M ft³';
            if (type === 'len') return (num * 3.28084).toLocaleString(undefined, {maximumFractionDigits: 0}) + ' ft';
        }
        if (type === 'area') return num.toLocaleString() + ' m²';
        if (type === 'vol') return num.toLocaleString() + ' M m³';
        return num.toLocaleString() + ' m';
    };

    const processData = () => {
        let data = allChambers.filter(c => 
            normalize(c.cave_name).includes(state.searchTerm) || 
            normalize(c.country).includes(state.searchTerm)
        );

        data.sort((a, b) => {
            let valA = a[state.sortColumn] ?? -Infinity;
            let valB = b[state.sortColumn] ?? -Infinity;
            return valA < valB ? -1 * state.sortDirection : 1 * state.sortDirection;
        });

        const totalPages = state.itemsPerPage === 'all' ? 1 : Math.ceil(data.length / state.itemsPerPage);
        const start = state.itemsPerPage === 'all' ? 0 : (state.currentPage - 1) * state.itemsPerPage;
        const pageData = state.itemsPerPage === 'all' ? data : data.slice(start, start + state.itemsPerPage);

        renderTable(pageData);
        renderPagination(totalPages);
    };

    const renderTable = (data) => {
        tableBody.innerHTML = data.map(c => `
            <tr>
                <td>${c.cave_name}</td>
                <td>${c.country}</td>
                <td>${formatNum(c.area_m2, 'area')}</td>
                <td>${formatNum(c.volume_million_m3, 'vol')}</td>
                <td>${formatNum(c.height_m, 'len')}</td>
                <td class="small-text">${c.dimensions_str || '-'}</td>
                <td><span class="badge">${c.data_type}</span></td>
                <td class="small-text">${c.source}</td>
            </tr>
        `).join('');
    };

    const renderPagination = (total) => {
        paginationControls.innerHTML = '';
        if (total <= 1) return;
        for (let i = 1; i <= total; i++) {
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.classList.toggle('active', i === state.currentPage);
            btn.onclick = () => { state.currentPage = i; processData(); };
            paginationControls.appendChild(btn);
        }
    };

    fetch('chamber_data.json')
        .then(res => res.json())
        .then(json => {
            allChambers = json.data;
            processData();
        });

    unitToggleBtn.addEventListener('click', () => {
        state.isMetric = !state.isMetric;
        unitToggleBtn.innerText = state.isMetric ? "Switch to Imperial (ft/ft²)" : "Switch to Metric (m/m²)";
        processData();
    });

    searchInput.addEventListener('input', (e) => {
        state.searchTerm = normalize(e.target.value);
        state.currentPage = 1;
        processData();
    });

    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const col = header.getAttribute('data-sort');
            state.sortDirection = (state.sortColumn === col) ? state.sortDirection * -1 : 1;
            state.sortColumn = col;
            processData();
        });
    });
});
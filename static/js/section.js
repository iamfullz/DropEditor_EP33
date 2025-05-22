function updateDropRateSummary(api) {
    let dropRateIndex = -1;

    // Határozzuk meg pontosan a DropRate oszlop sorszámát
    api.columns().every(function (index) {
        const headerText = $(this.header()).text().trim();
        if (headerText === "DropRate") {
            dropRateIndex = index;
        }
    });

    if (dropRateIndex === -1) return;

    let total = 0;

    api.rows({ filter: 'applied' }).nodes().each(function (row) {
        const $row = $(row);
        const $cell = $row.find('td').eq(dropRateIndex);
        const $value = $cell.find('.value');

        const rawText = $value.length ? $value.text().trim() : $cell.text().trim();
        const numericPart = rawText.split(/[^\d.]/)[0]; // levágjuk a szöveges részt pl. "123 (valami)" -> 123
        const parsed = parseFloat(numericPart);

        if (!isNaN(parsed)) {
            total += parsed;
        }
    });

    $('#dropRateSummary').text(`Total DropRate: ${total.toFixed(2)}`);
}

function refreshFilterOptions(api) {
    api.columns().every(function (colIdx) {
        if (colIdx === 0) return;
        const header = $(api.column(colIdx).header()).text().trim();
        const datalistId = 'filter-' + header.replace(/\W+/g, '');
        const $datalist = $('#' + datalistId);
        $datalist.empty();

        const unique = new Set();

        api.rows({ filter: 'applied' }).nodes().each(function (row) {
            const $cell = $(row).find('td').eq(colIdx);
            const $val = $cell.find('.value');
            const $desc = $cell.find('.desc');
            const base = $val.length ? $val.text().trim() : $cell.text().trim();
            const label = $desc.length ? `${base} ${$desc.text().trim()}` : base;
            if (base) unique.add(label);
        });

        Array.from(unique)
            .sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.localeCompare(b);
            })
            .slice(0, 200)
            .forEach(val => {
                $datalist.append(`<option value="${val.replace(/"/g, '&quot;')}">`);
            });
    });
}

$(document).ready(function () {
    const table = $('#datatable').DataTable({
        orderCellsTop: true,
        fixedHeader: true,
        pageLength: 25,
        columnDefs: [{ orderable: false, targets: 0 }],
        initComplete: function () {
            const api = this.api();
            $('#datatable thead').append('<tr class="filters"></tr>');

            api.columns().every(function (colIdx) {
                if (colIdx === 0) {
                    $('#datatable thead tr.filters').append('<th></th>');
                    return;
                }

                const header = $(api.column(colIdx).header()).text().trim();
                const datalistId = 'filter-' + header.replace(/\W+/g, '');
                const $input = $('<input type="text" list="' + datalistId + '" placeholder="Filter ' + header + '" style="width: 100%" />');
                const $datalist = $('<datalist id="' + datalistId + '"></datalist>');

                $('#datatable thead tr.filters').append($('<th></th>').append($input).append($datalist));

                $input.on('input', function () {
                    api.column(colIdx).search(this.value, false, true).draw();
                    updateDropRateSummary(api);
                    refreshFilterOptions(api);
                });
            });

            updateDropRateSummary(api);
            refreshFilterOptions(api);
        }
    });

    // törlés ikon
    $('#datatable tbody').on('click', '.delete-btn', function () {
        const row = $(this).closest('tr');
        table.row(row).remove().draw();
        updateDropRateSummary(table);
        refreshFilterOptions(table);
    });

    // új sor hozzáadása
    $('#addRowButton').on('click', function () {
        const row = ['<span class="delete-btn">&times;</span>'];

        const cols = $('#datatable thead th').length - 1;
        for (let i = 1; i < cols + 1; i++) {
            const colName = $('#datatable thead th').eq(i).text().trim();
            if (["ItemKind", "DungeonID", "WorldIdx", "BoxIdx", "DropRate", "ItemOpt", "OptPoolIdx"].includes(colName)) {
                row.push(`<span class="value" contenteditable="true"></span>`);
            } else {
                row.push('');
            }
        }

        table.row.add(row).draw();
        updateDropRateSummary(table);
        refreshFilterOptions(table);
    });

    // cella szerkesztés → szöveg frissítése
    $('#datatable').on('input', 'td.editable .value', function () {
        const $value = $(this);
        const $cell = $value.closest('td');
        const col = $cell.data('col');
        const numeric = $value.text().trim();

        $.get('/describe', { col: col, val: numeric }, function (desc) {
            $cell.find('.desc').remove();
            if (desc) {
                $cell.append(`<span class="desc"> (${desc})</span>`);
            }
        });

        // Update DropRate summary in real time when editing
        updateDropRateSummary(table);
    });

    // mentés
    $('#saveButton').on('click', function () {
        const modified = [];

        table.rows().every(function () {
            const row = this.node();
            const rowData = [];
            $(row).find('td').not('.delete-cell').each(function () {
                const $td = $(this);
                const $val = $td.find('.value');
                if ($val.length > 0) {
                    rowData.push($val.text().trim());
                } else {
                    let cellText = $td.text().trim();
                    cellText = cellText.replace(/\s*\([^)]*\)$/, '').trim();
                    rowData.push(cellText);
                }
            });
            modified.push(rowData);
        });

        $.ajax({
            url: '/save_full_table',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                section: $('#datatable').data('section'),
                header: JSON.parse($('#datatable').attr('data-header')),
                rows: modified
            }),
            success: function (res) {
                alert('File saved as: ' + res.filename);
            },
            error: function () {
                alert('Error while saving.');
            }
        });
    });

    // szűrők törlése
    $('#resetButton').on('click', function () {
        $('#datatable thead tr.filters input').val("");
        table.columns().search('').draw();
        updateDropRateSummary(table);
        refreshFilterOptions(table);
    });

    // Make existing OptPoolIdx cells editable
    $('#datatable tbody tr').each(function () {
        $(this).find('td').each(function () {
            const $td = $(this);
            const colName = $td.data('col');
            if (colName === 'OptPoolIdx' && !$td.find('.value').length) {
                const cellText = $td.text().trim();
                $td.html(`<span class="value" contenteditable="true">${cellText}</span>`);
            }
        });
    });
});

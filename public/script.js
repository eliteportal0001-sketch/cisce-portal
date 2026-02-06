document.addEventListener('DOMContentLoaded', () => {
    const showResultBtn = document.getElementById('show-result-btn');
    const printBtn = document.getElementById('print-btn');
    const errorMsg = document.getElementById('error-message');
    const resultDisplay = document.getElementById('result-display');

    const infoPanel = document.getElementById('info-panel');

    // Inputs
    const courseInput = document.getElementById('course');
    const uidInput = document.getElementById('uid');
    const index1Input = document.getElementById('index-1');
    const index2Input = document.getElementById('index-2');
    const captchaInput = document.getElementById('captcha-input');

    showResultBtn.addEventListener('click', async () => {
        // Clear errors
        errorMsg.textContent = '';

        // Gather data
        const course = courseInput.value;
        const uid = uidInput.value.trim();
        const index1 = index1Input.value.trim();
        const index2 = index2Input.value.trim();
        const captcha = captchaInput.value.trim();
        const fullIndex = `${index1}/${index2}`;

        // Basic Validation
        if (!uid || !index1 || !index2) {
            errorMsg.textContent = 'Please fill all fields.';
            return;
        }

        if (!captcha) {
            errorMsg.textContent = 'Please enter text shown in Captcha image.';
            return;
        }

        try {
            const response = await fetch('/api/results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    course,
                    uid,
                    indexNo: fullIndex,
                    captcha
                })
            });

            const data = await response.json();

            if (data.success) {
                displayResult(data.data, course, data.year);
                printBtn.disabled = false;
                resultDisplay.style.display = 'block';
                infoPanel.style.display = 'none';
            } else {
                errorMsg.textContent = data.message || 'Error fetching results.';
                resultDisplay.style.display = 'none';
                infoPanel.style.display = 'block';
            }

        } catch (error) {
            console.error('Error:', error);
            errorMsg.textContent = 'Server error. Please try again later.';
        }
    });

    printBtn.addEventListener('click', () => {
        window.print();
    });

    function displayResult(data, course, year) {
        document.getElementById('res-name').textContent = data.name;
        document.getElementById('res-uid').textContent = data.roll_number;
        document.getElementById('res-school').textContent = data.school;
        document.getElementById('res-status').textContent = data.result;

        // Dynamic Header
        const headerTitle = document.querySelector('.result-header h3');
        if (course === 'ICSE') {
            headerTitle.textContent = `INDIAN SCHOOL CERTIFICATE (CLASS X) RESULTS ${year}`;
        } else {
            headerTitle.textContent = `INDIAN SCHOOL CERTIFICATE (CLASS XII) RESULTS ${year}`;
        }

        const tbody = document.getElementById('result-body');
        tbody.innerHTML = '';

        data.scores.forEach(score => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${score.subject}</td>
                <td>${score.marks}</td>
            `;
            tbody.appendChild(row);
        });
    }
});

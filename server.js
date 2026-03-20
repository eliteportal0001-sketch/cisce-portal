const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const pool = require('./db.js');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));


app.post('/api/results', async (req, res) => {
    try {
        const { course, uid, indexNo, captcha } = req.body;

        if (captcha !== 'MLWAO' && captcha !== '12345') {
            return res.status(400).json({
                success: false,
                message: 'Invalid Captcha'
            });
        }

        if (!uid || !indexNo) {
            return res.status(400).json({
                success: false,
                message: 'UID and Index Number required'
            });
        }

        let classValue;
        if (course === 'ICSE') classValue = '10';
        else if (course === 'ISC') classValue = '+2';

        const [sheetNo, lastThree] = indexNo.split('/');

        const studentQuery = `
            SELECT *
            FROM students_icse
            WHERE roll_number = $1
            AND sheet_no = $2
            AND RIGHT(header_two, 3) = $3
            AND class = $4
            LIMIT 1
            `;

        const studentResult = await pool.query(studentQuery, [
            uid,
            sheetNo,
            lastThree,
            classValue
        ]);

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Result not found'
            });
        }

        const student = studentResult.rows[0];

        const subjectsQuery = `
            SELECT sub_name, marks
            FROM subjects_icse
            WHERE student_id = $1
            `;

        const subjectsResult = await pool.query(subjectsQuery, [student.id]);

        const scores = subjectsResult.rows.map(sub => ({
            subject: sub.sub_name,
            marks: sub.marks
        }));

        scores.push({
            subject: 'SUPW & COMMUNITY SERVICE',
            marks: 'A'
        })

        // percentage logic
        let percentage = 0;
        if (course === 'ICSE') {
            percentage = calculateICSEPercentage(scores);
        } else if (course === 'ISC') {
            percentage = calculateISCPercentage(scores);
        }

        const responseData = {
            name: student.candidate_name,
            roll_number: student.roll_number,
            father_name: student.father_name,
            mother_name: student.mother_name,
            school: student.school_no + '    ' + student.school_name,
            course: course.toUpperCase(),
            result: "QUALIFIED",
            percentage: percentage,
            scores: scores
        };

        res.json({
            success: true,
            data: responseData,
            year: student.year
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});



app.get('/api/results/direct', async (req, res) => {
    try {
        const { class: course, uid, index, index_no } = req.query;

        if (!uid || !index || !index_no) {
            return res.status(400).json({
                success: false,
                message: 'UID and Index Number required'
            });
        }

        let classValue;
        if (course.toUpperCase() === 'ICSE') classValue = '10';
        else if (course.toUpperCase() === 'ISC') classValue = '+2';

        const studentQuery = `
            SELECT *
            FROM students_icse
            WHERE roll_number = $1
            AND sheet_no = $2
            AND RIGHT(header_two, 3) = $3
            AND class = $4
            LIMIT 1
            `;

        const studentResult = await pool.query(studentQuery, [
            uid,
            index,
            index_no,
            classValue
        ]);

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Result not found'
            });
        }

        const student = studentResult.rows[0];

        const subjectsQuery = `
            SELECT sub_name, marks
            FROM subjects_icse
            WHERE student_id = $1
            `;

        const subjectsResult = await pool.query(subjectsQuery, [student.id]);

        const scores = subjectsResult.rows.map(sub => ({
            subject: sub.sub_name,
            marks: sub.marks
        }));

        scores.push({
            subject: 'SUPW & COMMUNITY SERVICE',
            marks: 'A'
        })

        // percentage logic
        let percentage = 0;
        if (course.toUpperCase() === 'ICSE') {
            percentage = calculateICSEPercentage(scores);
        } else if (course.toUpperCase() === 'ISC') {
            percentage = calculateISCPercentage(scores);
        }

        const responseData = {
            name: student.candidate_name,
            roll_number: student.roll_number,
            father_name: student.father_name,
            mother_name: student.mother_name,
            school: student.school_no + '    ' + student.school_name,
            course: course.toUpperCase(),
            result: "QUALIFIED",
            percentage: percentage,
            scores: scores
        };

        res.json({
            success: true,
            data: responseData,
            year: student.year
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});



function calculateICSEPercentage(subjects) {
    let englishMarks = [];
    let historyGeo = [];
    let science = [];
    let otherSubjects = [];

    subjects.forEach(sub => {
        const name = sub.subject.toLowerCase();
        const marks = Number(sub.marks);

        if (isNaN(marks)) return;

        if (name.includes("english")) englishMarks.push(marks);
        else if (name.includes("history") || name.includes("geography"))
            historyGeo.push(marks);
        else if (
            name.includes("physics") ||
            name.includes("chemistry") ||
            name.includes("biology")
        )
            science.push(marks);
        else
            otherSubjects.push(marks);
    });

    const avg = arr =>
        arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const english = avg(englishMarks);
    const hcg = avg(historyGeo);
    const sci = avg(science);

    const finalSubjects = [english, hcg, sci, ...otherSubjects];

    finalSubjects.sort((a, b) => b - a);
    const best5 = finalSubjects.slice(0, 5);

    const percentage =
        Math.round(best5.reduce((a, b) => a + b, 0) / best5.length);

    return percentage;
}


function calculateISCPercentage(subjects) {
    let englishMarks = [];
    let otherSubjects = [];

    subjects.forEach(sub => {
        const name = sub.subject.toLowerCase();
        const marks = Number(sub.marks);

        if (isNaN(marks)) return;

        if (name.includes("english")) englishMarks.push(marks);
        else otherSubjects.push(marks);
    });

    const english =
        englishMarks.length
            ? Math.round(englishMarks.reduce((a, b) => a + b, 0) / englishMarks.length)
            : 0;

    otherSubjects.sort((a, b) => b - a);
    const best3 = otherSubjects.slice(0, 3);

    const percentage =
        Math.round((english + best3.reduce((a, b) => a + b, 0)) / 4);

    return percentage;
}



// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

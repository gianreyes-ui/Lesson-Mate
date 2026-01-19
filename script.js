let subjects = [];


window.onload = function() {
    loadData();
    updateSubjectSelects();
    renderSubjectsLessons();
    renderSubjectList();
};


function loadData() {
    const data = localStorage.getItem('lessonMateData');
    if (data) {
        subjects = JSON.parse(data);
    }
}

function saveData() {
    localStorage.setItem('lessonMateData', JSON.stringify(subjects));
}


let currentLesson = null;

let quizData = [];
let userAnswers = [];
let timerInterval;
let currentScore = 0;
let isReviewMode = false;


const subjectName = document.getElementById('subjectName');
const subjectSelect = document.getElementById('subjectSelect');
const quizSubjectSelect = document.getElementById('quizSubjectSelect');
const lessonSelect = document.getElementById('lessonSelect');

const lessonTitle = document.getElementById('lessonTitle');
const lessonContent = document.getElementById('lessonContent');

const subjectsLessonsList = document.getElementById('subjectsLessonsList');
const subjectList = document.getElementById('subjectList');

const lessonTitleContent = document.getElementById('lessonTitleContent');
const lessonContentEditor = document.getElementById('lessonContentEditor');

const takeQuiz = document.getElementById('takeQuiz');
const quizContent = document.getElementById('quizContent');
const quizResult = document.getElementById('quizResult');
const quizTimer = document.getElementById('quizTimer');
const scoreText = document.getElementById('scoreText');
const submitCorrectionsBtn = document.getElementById('submitCorrectionsBtn');
const viewResultBtn = document.getElementById('viewResultBtn');

const resultContent = document.getElementById('resultContent');
const resultScore = document.getElementById('resultScore');
const correctAnswersList = document.getElementById('correctAnswersList');


function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    const section = document.getElementById(id);
    if (!section) return console.error(`Section '${id}' not found`);
    section.style.display = 'block';
}


function addSubject() {
    const name = subjectName.value.trim();
    if (!name) return alert("Enter subject name");

    subjects.push({ name, lessons: [] });
    subjectName.value = '';

    updateSubjectSelects();
    renderSubjectsLessons();
    renderSubjectList();
    saveData();
}

function renderSubjectList() {
    subjectList.innerHTML = '';
    if (subjects.length === 0) {
        subjectList.innerHTML = '<p>No subjects added yet.</p>';
        return;
    }
    subjects.forEach(s => {
        subjectList.innerHTML += `<p>${s.name}</p>`;
    });
}


function updateSubjectSelects() {
    subjectSelect.innerHTML = '';
    quizSubjectSelect.innerHTML = '';

    subjects.forEach(s => {
        subjectSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        quizSubjectSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
    });

    updateLessonSelect();
}


function addLesson() {
    const subject = subjects.find(s => s.name === subjectSelect.value);
    if (!subject) return alert("Select subject first");

    if (!lessonTitle.value || !lessonContent.value) return alert("Enter lesson title and content");

    subject.lessons.push({ title: lessonTitle.value, content: lessonContent.value });
    lessonTitle.value = '';
    lessonContent.value = '';

    renderSubjectsLessons();
    updateLessonSelect();
    saveData();
}


function renderSubjectsLessons() {
    subjectsLessonsList.innerHTML = '';
    if (subjects.length === 0) {
        subjectsLessonsList.innerHTML = `<p>No subjects added</p>`;
        return;
    }

    subjects.forEach(s => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h3>${s.name}</h3>
            ${
                s.lessons.length === 0
                ? `<p class="muted">No lessons</p>`
                : s.lessons.map(l => `<div class="lesson-item" onclick="openLesson('${s.name}','${l.title}')">📘 ${l.title}</div>`).join('')
            }
        `;
        subjectsLessonsList.appendChild(div);
    });
}


function openLesson(subName, lessonTitle) {
    const subject = subjects.find(s => s.name === subName);
    currentLesson = subject.lessons.find(l => l.title === lessonTitle);

    lessonTitleContent.innerText = currentLesson.title;
    lessonContentEditor.value = currentLesson.content;

    showSection('viewLessonContent');
}

function saveLessonContent() {
    currentLesson.content = lessonContentEditor.value;
    alert("Lesson updated!");
    renderSubjectsLessons();
    saveData();
}

function markLessonCompleted() {
    alert("Lesson marked as completed!");
}


function updateLessonSelect() {
    lessonSelect.innerHTML = '';
    const subject = subjects.find(s => s.name === quizSubjectSelect.value);
    if (!subject || subject.lessons.length === 0) {
        lessonSelect.innerHTML = `<option disabled selected>No lessons</option>`;
        return;
    }
    subject.lessons.forEach(l => {
        lessonSelect.innerHTML += `<option value="${l.title}">${l.title}</option>`;
    });
}


function generateQuiz() {
    const selectedTypes = [...document.querySelectorAll('#quizTypeContainer input:checked')].map(cb => cb.value);
    if (!quizSubjectSelect.value) return alert("Select subject");
    if (!lessonSelect.value) return alert("Select lesson");
    if (selectedTypes.length === 0) return alert("Select at least one quiz type");

    const subject = subjects.find(s => s.name === quizSubjectSelect.value);
    const lesson = subject.lessons.find(l => l.title === lessonSelect.value);

    quizData = createAIQuestions(lesson.content, selectedTypes);
    userAnswers = [];

    if (quizData.length === 0) return alert("Not enough detailed content to generate a challenging quiz. Add more in-depth lesson material!");

    isReviewMode = false;
    takeQuiz.classList.remove('hidden');
    quizResult.classList.add('hidden');
    submitCorrectionsBtn.classList.add('hidden');
    viewResultBtn.classList.add('hidden');

    renderQuiz();
}


function createAIQuestions(lessonText, types) {
    const questions = [];
    const usedSentences = new Set();

    const sentences = lessonText
        .replace(/\n/g, ' ')
        .split('.')
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.split(' ').length > 8);

    if (sentences.length < 3) return questions;

    const maxPerType = Math.max(2, Math.floor(15 / types.length));

    types.forEach(type => {
        let count = 0;
        for (let sentence of shuffleArray(sentences)) {
            if (count >= maxPerType || usedSentences.has(sentence)) continue;

            if (type === 'identification' && sentence.includes(' is ')) {
                const parts = sentence.split(' is ');
                if (parts.length > 1) {
                    const term = extractComplexTerm(parts[0]);
                    const def = parts[1].trim();
                    questions.push({
                        type: 'identification',
                        question: `Explain what "${term}" means in the context of the lesson, based on the provided material.`,
                        answer: def,
                        options: []
                    });
                    usedSentences.add(sentence);
                    count++;
                }
            } else if (type === 'trueFalse') {
                const isFalse = Math.random() > 0.5;
                let statement = sentence;
                let answer = 'true';
                if (isFalse) {
                    statement = negateStatement(sentence);
                    answer = 'false';
                }
                questions.push({
                    type: 'trueFalse',
                    question: `True or False: ${statement}.`,
                    answer,
                    options: ['true', 'false']
                });
                usedSentences.add(sentence);
                count++;
            } else if (type === 'multipleChoice') {
                const correct = sentence;
                const distractors = generateSmartDistractors(correct, sentences);
                if (distractors.length >= 3) {
                    const options = shuffleArray([correct, ...distractors]);
                    const correctIndex = options.indexOf(correct);
                    questions.push({
                        type: 'multipleChoice',
                        question: `Which of the following best describes a key concept from the lesson?`,
                        answer: String.fromCharCode(97 + correctIndex),
                        options: options.map((opt, i) => ({ label: String.fromCharCode(97 + i), text: opt }))
                    });
                    usedSentences.add(sentence);
                    count++;
                }
            } else if (type === 'fillInTheBlank') {
                const blanked = createFillInBlank(sentence);
                if (blanked.blank && blanked.answer) {
                    questions.push({
                        type: 'fillInTheBlank',
                        question: `Fill in the blank: ${blanked.blank}`,
                        answer: blanked.answer.toLowerCase(),
                        options: []
                    });
                    usedSentences.add(sentence);
                    count++;
                }
            }
        }
    });

    return questions;
}

function extractComplexTerm(text) {
    const words = text.trim().split(' ');
    return words.length > 3 ? words.slice(-3).join(' ') : words.slice(-1).join(' ');
}

function negateStatement(sentence) {
    const negations = {
        'is': 'is not',
        'are': 'are not',
        'was': 'was not',
        'has': 'does not have',
        'can': 'cannot'
    };
    let negated = sentence;
    for (let [key, val] of Object.entries(negations)) {
        if (negated.includes(` ${key} `)) {
            negated = negated.replace(` ${key} `, ` ${val} `);
            break;
        }
    }
    return negated;
}

function generateSmartDistractors(correct, allSentences) {
    const distractors = [];
    const words = correct.split(' ');
    const synonyms = {
        'mathematics': ['science', 'physics', 'logic'],
        'branch': ['type', 'part', 'field'],
        'calculus': ['algebra', 'geometry', 'statistics'],
        'change': ['variation', 'difference', 'shift']
    };
    words.forEach(word => {
        if (synonyms[word.toLowerCase()]) {
            distractors.push(...synonyms[word.toLowerCase()].map(syn => correct.replace(word, syn)));
        }
    });
    const others = allSentences.filter(s => s !== correct).slice(0, 3 - distractors.length);
    return [...distractors.slice(0, 3), ...others].slice(0, 3);
}

function createFillInBlank(sentence) {
    const words = sentence.split(' ');
    if (words.length < 5) return { blank: '', answer: '' };
    const blankIndex = Math.floor(Math.random() * (words.length - 2)) + 1;
    const answer = words[blankIndex];
    words[blankIndex] = '_____';
    return { blank: words.join(' '), answer };
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


function renderQuiz() {
    quizContent.innerHTML = '';
    quizData.forEach((q, i) => {
        let inputHtml = '';
        let className = '';
        let disabled = '';

        if (isReviewMode) {
            const userAns = userAnswers[i] || '';
            const isCorrect = isStrictlySimilar(userAns, q.answer);
            className = isCorrect ? 'correct-answer' : 'wrong-answer';
            disabled = isCorrect ? 'disabled' : '';
        }

        if (q.type === 'multipleChoice' || q.type === 'trueFalse') {
            inputHtml = q.options.map(opt => {
                let checked = '';
                if (isReviewMode && userAnswers[i] === (q.type === 'multipleChoice' ? opt.label : opt)) {
                    checked = 'checked';
                }
                return `<label><input type="radio" name="q${i}" value="${q.type === 'multipleChoice' ? opt.label : opt}" ${checked} ${disabled}> ${q.type === 'multipleChoice' ? opt.label.toUpperCase() + '. ' + opt.text : opt}</label><br>`;
            }).join('');
        } else if (q.type === 'identification') {
            const value = isReviewMode ? (userAnswers[i] || '') : '';
            inputHtml = `<textarea id="ans${i}" rows="3" placeholder="Provide a detailed explanation" ${disabled}>${value}</textarea>`;
        } else if (q.type === 'fillInTheBlank') {
            const value = isReviewMode ? (userAnswers[i] || '') : '';
            inputHtml = `<input type="text" id="ans${i}" placeholder="Fill in the blank" value="${value}" ${disabled}>`;
        }

        quizContent.innerHTML += `
            <div class="quiz-question ${className}">
                <p><strong>${q.question}</strong></p>
                ${inputHtml}
            </div>
        `;
    });

    if (isReviewMode) {
        submitCorrectionsBtn.classList.remove('hidden');
        viewResultBtn.classList.remove('hidden');
    } else {
        submitCorrectionsBtn.classList.add('hidden');
        viewResultBtn.classList.add('hidden');
    }
}


function startTimer(seconds) {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        quizTimer.innerText = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
        if (seconds-- <= 0) submitQuiz();
    }, 1000);
}


function submitQuiz() {
    clearInterval(timerInterval);

    userAnswers = quizData.map((q, i) => {
        if (q.type === 'multipleChoice' || q.type === 'trueFalse') {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            return selected ? selected.value : '';
        } else {
            const input = document.getElementById(`ans${i}`);
            return input ? input.value.trim().toLowerCase() : '';
        }
    });

    currentScore = userAnswers.reduce((score, ans, i) => score + (isStrictlySimilar(ans, quizData[i].answer) ? 1 : 0), 0);

    isReviewMode = true;
    renderQuiz();
}


function submitCorrections() {
    userAnswers = quizData.map((q, i) => {
        if (q.type === 'multipleChoice' || q.type === 'trueFalse') {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            return selected ? selected.value : '';
        } else {
            const input = document.getElementById(`ans${i}`);
            return input ? input.value.trim().toLowerCase() : '';
        }
    });

    currentScore = userAnswers.reduce((score, ans, i) => score + (isStrictlySimilar(ans, quizData[i].answer) ? 1 : 0), 0);

    showResult();
}


function isStrictlySimilar(user, correct) {
    if (!user || !correct) return false;
    const cleanUser = user.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const cleanCorrect = correct.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const userWords = cleanUser.split(' ');
    const correctWords = cleanCorrect.split(' ');
    const overlap = userWords.filter(word => correctWords.includes(word)).length;
    const matchRatio = overlap / correctWords.length;
    return matchRatio >= 0.7 || cleanUser === cleanCorrect;
}


function showResult() {
    resultScore.innerText = `Score: ${currentScore}/${quizData.length}`;
    showCorrectAnswers();
    showSection('result');
}


function showCorrectAnswers() {
    correctAnswersList.innerHTML = '';
    quizData.forEach((q, i) => {
        const userAns = userAnswers[i] || 'No answer';
        const isCorrect = isStrictlySimilar(userAns, q.answer);
        correctAnswersList.innerHTML += `
            <div class="${isCorrect ? 'correct' : 'wrong'}">
                <strong>Question ${i + 1} (${q.type}):</strong> ${q.question}<br>
                <strong>Your Answer:</strong> ${userAns}<br>
                <strong>Correct Answer:</strong> ${q.answer}
            </div>
        `;
    });
}


function retakeQuiz() { generateQuiz(); }

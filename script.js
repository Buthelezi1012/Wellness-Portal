const emailConfig = {
    publicKey: 'oSdhU6pu7gE-RKZ1U',
    serviceId: 'service_51loowv',
    templateId: 'template_aq5zpeq', // HR request template
    resetTemplateId: 'template_reset123' // Replace with your actual reset template ID
};

const firebaseConfig = {
    apiKey: "AIzaSyAJB0GeoDHfZ1SiXVybf9ZEqx5PQZfA1tI",
    authDomain: "wellness-portal-58a42.firebaseapp.com",
    databaseURL: "https://wellness-portal-58a42-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "wellness-portal-58a42",
    storageBucket: "wellness-portal-58a42.firebasestorage.app",
    messagingSenderId: "818310041574",
    appId: "1:818310041574:web:71617736907b5a1e8ed027"
};

firebase.initializeApp(firebaseConfig);
console.log('Firebase initialized');
const db = firebase.database();

let currentEmployeeName = null;
let points = 0;
let HR_USERNAME = "hradmin";
let HR_PASSWORD = "HR1234";

(function(){emailjs.init(emailConfig.publicKey);})();

// Dark Mode Toggle
function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = body.classList.toggle('dark-mode');
    const toggleButton = document.getElementById('dark-mode-toggle');
    toggleButton.innerHTML = isDarkMode 
        ? '<i class="fas fa-sun"></i> Light Mode'
        : '<i class="fas fa-moon"></i> Dark Mode';
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
}

window.onload = function() {
    document.getElementById('employee-main').style.display = 'none';
    document.getElementById('hr-main').style.display = 'none';
    checkLeaderboardReset();
    // Clear login fields on load
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-password').value = '';
    document.getElementById('hr-username').value = '';
    document.getElementById('hr-password').value = '';
    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    }
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
};

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return hash.toString();
}

document.getElementById('employee-login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('emp-name').value.trim();
    const password = document.getElementById('emp-password').value.trim();
    console.log('Login attempt:', name, password);

    if (!name || !password) {
        document.getElementById('emp-login-message').textContent = 'Please enter both name and password.';
        return;
    }

    const nameParts = name.split(' ');
    if (nameParts.length < 2) {
        document.getElementById('emp-login-message').textContent = 'Please enter both your first name and surname (e.g., John Smith)';
        return;
    }

    let baseName = nameParts.join('');
    let uniqueName = baseName;
    let counter = 1;

    db.ref('passwords').once('value', snapshot => {
        const passwords = snapshot.val() || {};
        while (passwords[`${uniqueName}_password`] && passwords[`${uniqueName}_password`] !== simpleHash(password)) {
            uniqueName = `${baseName}${counter}`;
            counter++;
        }

        const storedPassword = passwords[`${uniqueName}_password`];
        if (storedPassword) {
            if (storedPassword === simpleHash(password)) {
                currentEmployeeName = uniqueName;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('employee-main').style.display = 'block';
                document.getElementById('hr-main').style.display = 'none';
                loadEmployeeData();
                document.getElementById('emp-login-message').textContent = '';
                console.log('Login successful:', uniqueName);
            } else {
                document.getElementById('emp-login-message').textContent = 'Incorrect password.';
                console.log('Incorrect password for:', uniqueName);
            }
        } else {
            db.ref(`passwords/${uniqueName}_password`).set(simpleHash(password))
                .then(() => {
                    currentEmployeeName = uniqueName;
                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('employee-main').style.display = 'block';
                    document.getElementById('hr-main').style.display = 'none';
                    loadEmployeeData();
                    document.getElementById('emp-login-message').textContent = '';
                    console.log('New user registered:', uniqueName);
                })
                .catch(error => {
                    document.getElementById('emp-login-message').textContent = 'Error saving password. Try again.';
                    console.error('Firebase write error:', error);
                });
        }
    }).catch(error => {
        document.getElementById('emp-login-message').textContent = 'Error connecting to database. Check connection.';
        console.error('Firebase read error:', error);
    });
});

document.getElementById('hr-login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('hr-username').value.trim();
    const password = document.getElementById('hr-password').value.trim();

    if (username === HR_USERNAME && password === HR_PASSWORD) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('employee-main').style.display = 'none';
        document.getElementById('hr-main').style.display = 'block';
        loadHRDashboard();
        document.getElementById('hr-login-message').textContent = '';
        console.log('HR login successful');
    } else {
        document.getElementById('hr-login-message').textContent = 'Incorrect username or password.';
        console.log('HR login failed');
    }
});

function showForgotPassword() {
    const form = document.getElementById('forgot-password-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

document.getElementById('forgot-password-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('forgot-emp-name').value.trim();
    const nameParts = name.split(' ');
    if (nameParts.length < 2) {
        document.getElementById('forgot-password-message').textContent = 'Please enter both first name and surname.';
        return;
    }

    const uniqueName = nameParts.join('');
    db.ref('passwords').once('value', snapshot => {
        const passwords = snapshot.val() || {};
        if (passwords[`${uniqueName}_password`]) {
            const resetCode = Math.random().toString(36).slice(2, 8);
            db.ref(`resetCodes/${uniqueName}`).set({ code: resetCode, expires: Date.now() + 24 * 60 * 60 * 1000 })
                .then(() => {
                    emailjs.send(emailConfig.serviceId, emailConfig.resetTemplateId, {
                        employee_name: uniqueName,
                        reset_code: resetCode,
                        reset_link: `https://nqobileb.github.io/wellness-portal/reset.html?code=${resetCode}&name=${uniqueName}`
                    }).then(() => {
                        document.getElementById('forgot-password-message').textContent = 'Reset link sent to your email (check console for demo).';
                        console.log(`Reset link for ${uniqueName}: https://nqobileb.github.io/wellness-portal/reset.html?code=${resetCode}&name=${uniqueName}`);
                    }, error => {
                        document.getElementById('forgot-password-message').textContent = 'Failed to send reset email.';
                        console.error('EmailJS reset error:', error);
                    });
                });
        } else {
            document.getElementById('forgot-password-message').textContent = 'No account found with that name.';
        }
    });
});

document.getElementById('hr-password-change-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('current-hr-password').value;
    const newUsername = document.getElementById('new-hr-username').value.trim();
    const newPassword = document.getElementById('new-hr-password').value;

    if (currentPassword !== HR_PASSWORD) {
        document.getElementById('hr-password-message').textContent = 'Current password incorrect.';
        return;
    }

    if (!newUsername || !newPassword) {
        document.getElementById('hr-password-message').textContent = 'Please enter both new username and password.';
        return;
    }

    HR_USERNAME = newUsername;
    HR_PASSWORD = newPassword;
    document.getElementById('hr-password-message').textContent = 'Password and username updated successfully.';
    this.reset();
    console.log('HR credentials updated:', HR_USERNAME, HR_PASSWORD);
});

function loadEmployeeData() {
    loadStressHistory();
    loadHRRequests();
    loadMoodForecast();
    db.ref(`points/${currentEmployeeName}`).once('value', snapshot => {
        points = snapshot.val() || 0;
        document.getElementById('points').textContent = points;
        console.log('Points loaded:', points);
    }).catch(error => console.error('Error loading points:', error));
}

function loadHRDashboard() {
    const tbody = document.getElementById('hr-stress-table-body');
    tbody.innerHTML = '';

    db.ref('stressLogs').once('value', snapshot => {
        const allLogs = [];
        const logsData = snapshot.val() || {};
        for (let employeeName in logsData) {
            const logs = logsData[employeeName];
            for (let logId in logs) {
                const log = logs[logId];
                allLogs.push({
                    employee: employeeName,
                    timestamp: new Date(log.timestamp),
                    stressLevel: log.stressLevel,
                    notes: log.stressNotes || 'None'
                });
            }
        }

        allLogs.sort((a, b) => b.timestamp - a.timestamp);

        allLogs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.employee}</td>
                <td>${formatTimestamp(log.timestamp)}</td>
                <td>${log.stressLevel}/10</td>
                <td>${log.notes}</td>
            `;
            tbody.appendChild(row);
        });
        console.log('HR stress logs loaded:', allLogs.length);
    }).catch(error => console.error('Error loading stress logs:', error));

    loadHRMoodForecast();
}

function loadHRMoodForecast() {
    db.ref('moods').once('value', snapshot => {
        const moods = snapshot.val() ? Object.values(snapshot.val()) : [];
        if (moods.length === 0) {
            document.getElementById('hrMoodChart').style.display = 'none';
            document.getElementById('hr-forecast-text').textContent = 'No mood data yet.';
            console.log('No mood data for HR');
            return;
        }

        const moodCounts = { sunny: 0, cloudy: 0, stormy: 0, rainy: 0 };
        moods.forEach(entry => moodCounts[entry.mood]++);

        const total = moods.length;
        const forecast = Object.entries(moodCounts).reduce((prev, curr) => 
            curr[1] > prev[1] ? curr : prev, ['sunny', 0])[0];
        let forecastText = `Today’s Workplace Forecast: Mostly ${forecast.charAt(0).toUpperCase() + forecast.slice(1)}`;
        if (moodCounts.stormy + moodCounts.rainy > total * 0.3) {
            forecastText += ' with a chance of stress. Consider a team break!';
        } else if (moodCounts.sunny > total * 0.5) {
            forecastText += '. Great vibes all around!';
        }
        document.getElementById('hr-forecast-text').textContent = forecastText;

        document.getElementById('hrMoodChart').style.display = 'block';
        const ctx = document.getElementById('hrMoodChart').getContext('2d');
        if (window.hrMoodChartInstance) {
            window.hrMoodChartInstance.destroy();
        }
        window.hrMoodChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Sunny 😊', 'Cloudy 😐', 'Stormy 😣', 'Rainy 😢'],
                datasets: [{
                    data: [moodCounts.sunny, moodCounts.cloudy, moodCounts.stormy, moodCounts.rainy],
                    backgroundColor: ['#FFD700', '#B0C4DE', '#4682B4', '#778899']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Workplace Mood Distribution' }
                }
            }
        });
        console.log('HR mood chart loaded');
    }).catch(error => console.error('Error loading HR mood:', error));
}

document.getElementById('graph-request-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const employeeName = document.getElementById('graph-employee-name').value.trim();

    db.ref(`stressLogs/${employeeName}`).once('value', snapshot => {
        const logs = snapshot.val() ? Object.values(snapshot.val()) : [];
        if (logs.length === 0) {
            document.getElementById('employeeStressChart').style.display = 'none';
            document.getElementById('graph-message').textContent = `No stress logs found for ${employeeName}.`;
            console.log('No stress logs for:', employeeName);
            return;
        }

        document.getElementById('employeeStressChart').style.display = 'block';
        document.getElementById('graph-message').textContent = '';

        const labels = logs.map(log => formatTimestamp(new Date(log.timestamp)));
        const data = logs.map(log => log.stressLevel);

        const ctx = document.getElementById('employeeStressChart').getContext('2d');
        if (window.employeeStressChartInstance) {
            window.employeeStressChartInstance.destroy();
        }
        window.employeeStressChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `${employeeName}'s Stress Levels`,
                    data: data,
                    backgroundColor: '#FF6384'
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, max: 10, title: { display: true, text: 'Stress Level' } },
                    x: { title: { display: true, text: 'Logged Times' } }
                }
            }
        });

        const existingHideBtn = document.querySelector('#employee-graph-request button.hide-chart');
        if (!existingHideBtn) {
            const hideBtn = document.createElement('button');
            hideBtn.textContent = 'Hide Chart';
            hideBtn.className = 'hide-chart';
            hideBtn.onclick = () => document.getElementById('employeeStressChart').style.display = 'none';
            document.getElementById('employee-graph-request').appendChild(hideBtn);
        }
        console.log('Stress chart loaded for:', employeeName);
    }).catch(error => console.error('Error loading stress chart:', error));
});

document.getElementById('stress-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const stressLevel = document.getElementById('stress-level').value;
    const stressNotes = document.getElementById('stress-notes').value;
    const timestamp = new Date().toLocaleString();
    const log = { timestamp, stressLevel, stressNotes };

    db.ref(`stressLogs/${currentEmployeeName}`).push(log)
        .then(() => {
            document.getElementById('stress-message').textContent = `Stress logged: ${stressLevel}/10. ${stressNotes ? 'Notes: ' + stressNotes : ''}`;
            console.log('Stress logged:', log);
            let tip = '';
            if (stressLevel > 7) {
                tip = 'High stress detected! Try this <a href="https://www.youtube.com/watch?v=4pLUleLdwY4" target="_blank">5-minute meditation</a>.';
            } else if (stressLevel > 4) {
                tip = 'Moderate stress? Take a short walk or deep breaths.';
            } else {
                tip = 'Looking good! Keep up your wellness routine.';
            }
            document.getElementById('wellness-tip').innerHTML = tip;
            this.reset();
            document.getElementById('stress-level').value = 5;
            document.getElementById('stress-value').textContent = '5';
            loadStressHistory();
        })
        .catch(error => console.error('Error logging stress:', error));
});

document.getElementById('stress-level').addEventListener('input', function() {
    document.getElementById('stress-value').textContent = this.value;
});

document.getElementById('hr-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const urgency = document.getElementById('urgency').value;
    const contactMethod = document.getElementById('contact-method').value;
    const hrNotes = document.getElementById('hr-notes').value;
    const timestamp = new Date().toLocaleString();
    const request = { timestamp, urgency, contactMethod, hrNotes };

    db.ref(`hrRequests/${currentEmployeeName}`).push(request)
        .then(() => {
            emailjs.send(emailConfig.serviceId, emailConfig.templateId, {
                employee_name: currentEmployeeName,
                urgency: urgency,
                contact_method: contactMethod,
                notes: hrNotes,
                timestamp: timestamp
            }).then(() => {
                document.getElementById('hr-message').textContent = `Request sent to HR! Urgency: ${urgency}, Contact: ${contactMethod}. ${hrNotes ? 'Details: ' + hrNotes : ''}`;
                console.log('HR request sent:', request);
            }, (error) => {
                document.getElementById('hr-message').textContent = 'Failed to send request. Contact IT if this persists.';
                console.error('EmailJS error:', error);
            });
            this.reset();
            loadHRRequests();
        })
        .catch(error => console.error('Error saving HR request:', error));
});

function loadHRRequests() {
    db.ref(`hrRequests/${currentEmployeeName}`).once('value', snapshot => {
        const requests = snapshot.val() ? Object.values(snapshot.val()) : [];
        const list = document.getElementById('hr-request-list');
        list.innerHTML = '';
        requests.forEach(req => {
            const li = document.createElement('li');
            li.textContent = `${req.timestamp} - Urgency: ${req.urgency}, Contact: ${req.contactMethod}, Status: Pending`;
            list.appendChild(li);
        });
        console.log('HR requests loaded:', requests.length);
    }).catch(error => console.error('Error loading HR requests:', error));
}

function loadStressHistory() {
    db.ref(`stressLogs/${currentEmployeeName}`).once('value', snapshot => {
        const logs = snapshot.val() ? Object.values(snapshot.val()) : [];
        const tbody = document.getElementById('stress-table-body');
        tbody.innerHTML = '';

        const recentLogs = logs.slice(-5);
        recentLogs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatTimestamp(new Date(log.timestamp))}</td>
                <td>${log.stressLevel}/10</td>
                <td>${log.stressNotes || 'None'}</td>
            `;
            tbody.appendChild(row);
        });

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyLogs = logs.filter(log => new Date(log.timestamp) >= weekAgo);
        const avgStress = weeklyLogs.length ? (weeklyLogs.reduce((sum, log) => sum + parseInt(log.stressLevel), 0) / weeklyLogs.length).toFixed(1) : 0;
        document.getElementById('weekly-summary').innerHTML = `Past 7 Days: ${weeklyLogs.length} logs, Avg Stress: ${avgStress}/10`;
        console.log('Stress history loaded:', logs.length);
    }).catch(error => console.error('Error loading stress history:', error));
}

function clearStressLogs() {
    if (confirm('Are you sure you want to clear your stress logs?')) {
        db.ref(`stressLogs/${currentEmployeeName}`).remove()
            .then(() => {
                loadStressHistory();
                console.log('Stress logs cleared');
            })
            .catch(error => console.error('Error clearing stress logs:', error));
    }
}

function exportData() {
    Promise.all([
        db.ref(`stressLogs/${currentEmployeeName}`).once('value'),
        db.ref(`hrRequests/${currentEmployeeName}`).once('value'),
        db.ref(`points/${currentEmployeeName}`).once('value')
    ]).then(([stressSnapshot, hrSnapshot, pointsSnapshot]) => {
        const data = {
            stressLogs: stressSnapshot.val() ? Object.values(stressSnapshot.val()) : [],
            hrRequests: hrSnapshot.val() ? Object.values(hrSnapshot.val()) : [],
            points: pointsSnapshot.val() || 0
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentEmployeeName}_wellness_data.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('Data exported');
    }).catch(error => console.error('Error exporting data:', error));
}

function logout() {
    currentEmployeeName = null;
    document.getElementById('employee-main').style.display = 'none';
    document.getElementById('hr-main').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-password').value = '';
    document.getElementById('emp-login-message').textContent = '';
    console.log('Logged out');
}

function hrLogout() {
    document.getElementById('employee-main').style.display = 'none';
    document.getElementById('hr-main').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('hr-username').value = '';
    document.getElementById('hr-password').value = '';
    document.getElementById('hr-login-message').textContent = '';
    console.log('HR logged out');
}

function formatTimestamp(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours() % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    return `${month}/${day} ${hours}:${minutes} ${ampm}`;
}

function completeChallenge(challenge, pointsAwarded) {
    const status = document.getElementById(`${challenge}-status`).textContent;
    if (status.includes('Completed')) return;
    points += pointsAwarded;
    db.ref(`points/${currentEmployeeName}`).set(points)
        .then(() => {
            document.getElementById('points').textContent = points;
            document.getElementById(`${challenge}-status`).textContent = `✔ Completed! (+${pointsAwarded})`;
            db.ref('leaderboardData').child(currentEmployeeName).set(points)
                .then(() => {
                    loadLeaderboard();
                    console.log(`Challenge ${challenge} completed, points: ${points}`);
                })
                .catch(error => console.error('Error updating leaderboard:', error));
        })
        .catch(error => console.error('Error updating points:', error));
}

document.getElementById('mood-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const mood = document.getElementById('mood-select').value;
    const moodNote = document.getElementById('mood-note').value.trim();
    const timestamp = new Date().toLocaleString();
    const moodEntry = { mood, moodNote, timestamp, employee: currentEmployeeName };

    db.ref('moods').child(currentEmployeeName).set(moodEntry)
        .then(() => {
            document.getElementById('mood-message').textContent = `Mood logged: ${mood.charAt(0).toUpperCase() + mood.slice(1)}${moodNote ? ' - ' + moodNote : ''}`;
            this.reset();
            loadMoodForecast();
            console.log('Mood logged:', moodEntry);
        })
        .catch(error => console.error('Error logging mood:', error));
});

function loadMoodForecast() {
    db.ref('moods').once('value', snapshot => {
        const moods = snapshot.val() ? Object.values(snapshot.val()) : [];
        if (moods.length === 0) {
            document.getElementById('moodChart').style.display = 'none';
            document.getElementById('forecast-text').textContent = 'No mood data yet. Be the first to contribute!';
            console.log('No mood data');
            return;
        }

        const moodCounts = { sunny: 0, cloudy: 0, stormy: 0, rainy: 0 };
        moods.forEach(entry => moodCounts[entry.mood]++);

        const total = moods.length;
        const forecast = Object.entries(moodCounts).reduce((prev, curr) => 
            curr[1] > prev[1] ? curr : prev, ['sunny', 0])[0];
        let forecastText = `Today’s Workplace Forecast: Mostly ${forecast.charAt(0).toUpperCase() + forecast.slice(1)}`;
        if (moodCounts.stormy + moodCounts.rainy > total * 0.3) {
            forecastText += ' with a chance of stress. Consider a team break!';
        } else if (moodCounts.sunny > total * 0.5) {
            forecastText += '. Great vibes all around!';
        }
        document.getElementById('forecast-text').textContent = forecastText;

        document.getElementById('moodChart').style.display = 'block';
        const ctx = document.getElementById('moodChart').getContext('2d');
        if (window.moodChartInstance) {
            window.moodChartInstance.destroy();
        }
        window.moodChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Sunny 😊', 'Cloudy 😐', 'Stormy 😣', 'Rainy 😢'],
                datasets: [{
                    data: [moodCounts.sunny, moodCounts.cloudy, moodCounts.stormy, moodCounts.rainy],
                    backgroundColor: ['#FFD700', '#B0C4DE', '#4682B4', '#778899']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Workplace Mood Distribution' }
                }
            }
        });
        console.log('Mood chart loaded');
    }).catch(error => console.error('Error loading mood forecast:', error));
}

function checkLeaderboardReset() {
    const now = new Date();
    db.ref('lastLeaderboardReset').once('value', snapshot => {
        const lastReset = snapshot.val() ? new Date(snapshot.val()) : null;

        if (!lastReset || (now.getDate() === 1 && now.getMonth() !== lastReset.getMonth())) {
            db.ref('leaderboardData').remove()
                .then(() => {
                    db.ref('lastLeaderboardReset').set(now.toISOString())
                        .then(() => {
                            db.ref('points').once('value', snapshot => {
                                const allPoints = snapshot.val() || {};
                                for (let key in allPoints) {
                                    db.ref(`points/${key}`).set(0);
                                }
                                console.log('Leaderboard reset');
                            });
                        });
                })
                .catch(error => console.error('Error resetting leaderboard:', error));
        }
    }).catch(error => console.error('Error checking leaderboard reset:', error));
}

function loadLeaderboard() {
    db.ref('leaderboardData').once('value', snapshot => {
        const leaderboardData = snapshot.val() || {};
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';

        const sortedEntries = Object.entries(leaderboardData)
            .map(([name, points]) => ({ name, points: parseInt(points) }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 5);

        if (sortedEntries.length === 0) {
            leaderboardList.innerHTML = '<li>No participants yet. Start a challenge!</li>';
            console.log('No leaderboard data');
            return;
        }

        sortedEntries.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = `${entry.name}: ${entry.points} points`;
            leaderboardList.appendChild(li);
        });
        console.log('Leaderboard loaded:', sortedEntries.length);
    }).catch(error => console.error('Error loading leaderboard:', error));
}
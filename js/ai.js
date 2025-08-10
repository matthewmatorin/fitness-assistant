// AI Configuration
let openaiApiKey = localStorage.getItem('openai_api_key') || null;
let conversationHistory = [];

// API Key Management
function saveApiKey() {
    const apiKey = document.getElementById('openai-api-key').value.trim();
    if (!apiKey) {
        showToast('Please enter an API key', 'warning');
        return;
    }
    
    if (!apiKey.startsWith('sk-')) {
        showToast('Invalid API key format. Should start with "sk-"', 'error');
        return;
    }
    
    localStorage.setItem('openai_api_key', apiKey);
    openaiApiKey = apiKey;
    updateApiKeyStatus();
    showToast('API key saved successfully!', 'success');
    
    document.getElementById('openai-api-key').value = '';
}

function updateApiKeyStatus() {
    const statusDiv = document.getElementById('api-key-status');
    const apiKeyInput = document.getElementById('openai-api-key');
    
    if (openaiApiKey) {
        statusDiv.innerHTML = '<p style="color: #10b981;">✅ API key configured</p>';
        if (apiKeyInput) {
            apiKeyInput.placeholder = 'API key is set (enter new key to update)';
        }
    } else {
        statusDiv.innerHTML = '<p style="color: #f59e0b;">⚠️ No API key configured</p>';
        if (apiKeyInput) {
            apiKeyInput.placeholder = 'Enter your OpenAI API key';
        }
    }
}

// Sync Code Functions
function showSyncCode() {
    if (!openaiApiKey) {
        showToast('No API key to sync', 'warning');
        return;
    }
    
    const syncCode = btoa(JSON.stringify({
        key: openaiApiKey,
        timestamp: Date.now()
    }));
    
    document.getElementById('sync-code-text').value = syncCode;
    document.getElementById('sync-code-display').style.display = 'block';
}

function useSyncCode() {
    const syncCode = prompt('Enter sync code:');
    if (!syncCode) return;
    
    try {
        const decoded = JSON.parse(atob(syncCode));
        if (decoded.key && decoded.key.startsWith('sk-')) {
            localStorage.setItem('openai_api_key', decoded.key);
            openaiApiKey = decoded.key;
            updateApiKeyStatus();
            showToast('API key synced successfully!', 'success');
        } else {
            throw new Error('Invalid sync code format');
        }
    } catch (error) {
        showToast('Invalid sync code', 'error');
    }
}

function copySyncCode() {
    const syncCodeText = document.getElementById('sync-code-text');
    syncCodeText.select();
    document.execCommand('copy');
    showToast('Sync code copied to clipboard!', 'success');
}

// Chat Functions
async function handleChatQuestion() {
    const question = document.getElementById('chat-question').value.trim();
    if (!question) return;
    
    if (!openaiApiKey) {
        showToast('Please configure your OpenAI API key in Settings first', 'warning');
        showCurrentResponse(question, 'Please configure your OpenAI API key in the Settings tab to use AI chat.');
        return;
    }
    
    showCurrentResponse(question, 'Analyzing your fitness data...');
    document.getElementById('ask-question-btn').disabled = true;
    document.getElementById('ask-question-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    try {
        const response = await askChatGPT(question);
        showCurrentResponse(question, response);
        
        conversationHistory.push(
            { role: 'user', content: question },
            { role: 'assistant', content: response }
        );
        
        if (conversationHistory.length > 10) {
            conversationHistory = conversationHistory.slice(-10);
        }
        
    } catch (error) {
        console.error('Chat error:', error);
        let errorMessage = 'Sorry, I encountered an error analyzing your data. ';
        
        if (error.message.includes('401')) {
            errorMessage += 'Please check your API key in Settings.';
        } else if (error.message.includes('429')) {
            errorMessage += 'Rate limit exceeded. Please try again in a moment.';
        } else if (error.message.includes('network')) {
            errorMessage += 'Network error. Please check your connection.';
        } else {
            errorMessage += 'Please try again or check the console for details.';
        }
        
        showCurrentResponse(question, errorMessage);
        showToast('Chat error: ' + error.message, 'error');
    }
    
    document.getElementById('ask-question-btn').disabled = false;
    document.getElementById('ask-question-btn').innerHTML = '<i class="fas fa-paper-plane"></i> Ask';
    document.getElementById('chat-question').value = '';
}

async function askChatGPT(question) {
    const fitnessData = prepareFitnessDataForAI(question);
    
    const isPredictiveQuery = question.toLowerCase().includes('goal') || 
                            question.toLowerCase().includes('predict') ||
                            question.toLowerCase().includes('when will') ||
                            question.toLowerCase().includes('how long') ||
                            question.toLowerCase().includes('target') ||
                            question.toLowerCase().includes('recommend');
    
    const systemPrompt = `You are a fitness analyst and coach for Matt. Analyze comprehensive fitness data and provide specific insights.

Guidelines:
- Be specific with numbers and dates from the full dataset provided
- Keep responses under 200 words for detailed analysis
- Use bullet points for multiple insights
- Be encouraging but realistic
- Reference specific trends, patterns, and analytics provided
- Remember conversation context
- Leverage the extensive analytics provided (weightAnalytics, workoutAnalytics, etc.)
${isPredictiveQuery ? `
PREDICTIVE MODE:
- Calculate trends and project future outcomes using full dataset
- Set realistic timelines based on historical patterns
- Provide specific, actionable goal recommendations
- Include weekly/monthly targets when relevant
- Use the comprehensive analytics for better predictions` : ''}`;

    const messages = [
        {
            role: 'system',
            content: systemPrompt
        }
    ];

    const recentHistory = conversationHistory.slice(-6);
    messages.push(...recentHistory);

    let userPrompt = `Comprehensive Fitness Data: ${JSON.stringify(fitnessData)}

Q: ${question}

Provide detailed insights using the full dataset and analytics provided.`;

    if (isPredictiveQuery) {
        const predictions = calculatePredictions();
        userPrompt += `

CURRENT TRENDS AND PREDICTIONS:
${JSON.stringify(predictions)}

Use these trends along with the comprehensive analytics to provide specific predictions and goal recommendations.`;
    }

    messages.push({
        role: 'user',
        content: userPrompt
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: isPredictiveQuery ? 250 : 200,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI');
    }

    return data.choices[0].message.content.trim();
}

// Daily Insight Generation - Enhanced Version
async function generateDashboardInsight(forceNew = false) {
    if (!openaiApiKey || weightData.length < 3) {
        document.getElementById('daily-insight-text').textContent = 
            openaiApiKey ? 'Add more fitness data to get personalized insights...' : 
            'Configure your AI key in Settings to get personalized daily insights...';
        return;
    }
    
    try {
        document.getElementById('daily-insight-text').textContent = 'Generating your daily insight...';
        
        const predictions = calculatePredictions();
        const fullAnalytics = prepareFitnessDataForAI('general insight');
        
        const currentTime = new Date();
        const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
        const timeOfDay = currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 17 ? 'afternoon' : 'evening';
        
        const insightQuestions = [
            `It's ${dayOfWeek} ${timeOfDay}. Give me a brief daily insight and one specific focus for today based on my comprehensive fitness trends.`,
            `Based on my full fitness history and recent progress, what should I focus on today (${dayOfWeek})?`,
            `Give me today's fitness insight and a specific action item for this ${timeOfDay}, using my complete data.`,
            `What's one key insight from my full dataset and what should I prioritize today?`,
            `Based on my comprehensive fitness trends and analytics, give me an encouraging insight and today's focus area.`
        ];
        
        const questionIndex = (Math.floor(Date.now() / (1000 * 60 * 60)) + Math.floor(Math.random() * 3)) % insightQuestions.length;
        const insightQuestion = insightQuestions[questionIndex];
        
        const insight = await askChatGPTDirect(insightQuestion, { predictions, analytics: fullAnalytics }, forceNew);
        document.getElementById('daily-insight-text').textContent = insight;
        
    } catch (error) {
        console.log('Daily insight unavailable:', error.message);
        document.getElementById('daily-insight-text').textContent = 
            'Daily insights temporarily unavailable. Try asking a question in the Insights tab!';
    }
}

async function askChatGPTDirect(question, data, forceNew = false) {
    const messages = [
        {
            role: 'system',
            content: 'You are a fitness coach with access to comprehensive fitness data. Provide a brief daily insight and specific focus. Keep under 80 words. Vary your responses and be encouraging. Use the full analytics provided.'
        },
        {
            role: 'user',
            content: `Current time: ${new Date().toLocaleString()}
Comprehensive Analytics: ${JSON.stringify(data)}

Q: ${question}

Provide a fresh, encouraging insight with specific actionable advice based on the full dataset.`
        }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 120,
            temperature: forceNew ? 1.0 : 0.9
        })
    });

    if (!response.ok) throw new Error('Prediction request failed');

    const data_response = await response.json();
    return data_response.choices[0].message.content.trim();
}

// Manual insight generation function
async function manualGenerateInsight() {
    const button = document.getElementById('generate-insight-btn');
    if (!button) return;
    
    const originalText = button.innerHTML;
    
    try {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        await generateDashboardInsight(true);
        showToast('New insight generated!', 'success');
    } catch (error) {
        console.error('Manual insight generation failed:', error);
        showToast('Failed to generate insight. Check console for details.', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Enhanced Data Preparation for AI - Uses Full Dataset
function prepareFitnessDataForAI(question = '') {
    const q = question.toLowerCase();
    
    const needsWeight = q.includes('weight') || q.includes('lose') || q.includes('gain') || q.includes('lbs') || q.includes('pounds');
    const needsWalking = q.includes('walk') || q.includes('walking');
    const needsRunning = q.includes('run') || q.includes('running');
    const needsWorkouts = q.includes('workout') || q.includes('exercise') || q.includes('lift') || q.includes('tennis') || needsWalking || needsRunning;
    const needsBirthdays = q.includes('birthday') || q.includes('anniversary');
    const needsGeneral = !needsWeight && !needsWorkouts && !needsBirthdays;
    
    const result = {};
    
    // WEIGHT DATA - Use much more data for better insights
    if (needsWeight || needsGeneral) {
        const weightLimit = needsGeneral ? 50 : 100; // Increased from 10/20
        result.weights = weightData.slice(0, weightLimit).map(w => ({
            date: w.date.toISOString().split('T')[0],
            weight: w.weight,
            bodyFat: w.bodyFat || null
        }));
        
        // Add weight analytics
        if (weightData.length >= 5) {
            const weights = weightData.map(w => w.weight);
            const dates = weightData.map(w => w.date);
            
            result.weightAnalytics = {
                currentWeight: weights[0],
                startingWeight: weights[weights.length - 1],
                highestWeight: Math.max(...weights),
                lowestWeight: Math.min(...weights),
                totalLoss: Math.max(...weights) - weights[0],
                recentTrend: calculateWeightTrend(weightData.slice(0, 10)),
                monthlyTrend: calculateWeightTrend(weightData.slice(0, 30)),
                overallTrend: calculateWeightTrend(weightData),
                trackingDays: Math.floor((dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24)),
                averageWeeklyChange: calculateAverageWeeklyChange(weightData)
            };
        }
    }
    
    // WORKOUT DATA - Use full dataset for comprehensive analysis
    if (needsWorkouts || needsGeneral) {
        let workouts = workoutData;
        
        if (needsWalking && !needsRunning) {
            workouts = workoutData.filter(w => w.type === 'walk');
        } else if (needsRunning && !needsWalking) {
            workouts = workoutData.filter(w => w.type === 'run');
        } else if (q.includes('lift')) {
            workouts = workoutData.filter(w => w.type === 'lift');
        } else if (q.includes('tennis')) {
            workouts = workoutData.filter(w => w.type === 'tennis');
        }
        
        const workoutLimit = needsGeneral ? 75 : 150; // Increased from 15/25
        result.workouts = workouts.slice(0, workoutLimit).map(w => ({
            date: w.date.toISOString().split('T')[0],
            type: w.type,
            duration: w.duration || null,
            distance: w.distance || null,
            hrZone: w.hrZone || null
        }));
        
        // Add comprehensive workout analytics
        result.workoutAnalytics = {
            totalWorkouts: workoutData.length,
            workoutTypes: getWorkoutTypeBreakdown(workoutData),
            weeklyFrequency: calculateWorkoutFrequency(workoutData),
            monthlyTotals: getMonthlyWorkoutTotals(workoutData),
            consistency: calculateWorkoutConsistency(workoutData),
            recentActivity: getRecentActivitySummary(workoutData),
            personalBests: getPersonalBests(workoutData)
        };
    }
    
    // BIRTHDAY DATA - Include if relevant
    if (needsBirthdays) {
        const today = new Date();
        const sixMonthsFromNow = new Date(today.getTime() + (180 * 24 * 60 * 60 * 1000));
        result.birthdays = birthdayData.filter(b => {
            const thisYearBirthday = new Date(today.getFullYear(), b.date.getMonth(), b.date.getDate());
            return thisYearBirthday >= today && thisYearBirthday <= sixMonthsFromNow;
        }).map(b => ({
            name: b.name,
            date: b.date.toISOString().split('T')[0],
            age: b.age
        }));
    }
    
    // ENHANCED SUMMARY with full dataset insights
    result.summary = {
        totalWeights: weightData.length,
        totalWorkouts: workoutData.length,
        totalBirthdays: birthdayData.length,
        currentWeight: weightData.length > 0 ? weightData[0].weight : null,
        dataDateRange: getDataDateRange(),
        trackingStreak: calculateTrackingStreak(),
        mostActiveWorkoutType: getMostActiveWorkoutType(),
        averageWorkoutsPerWeek: calculateAverageWorkoutsPerWeek()
    };
    
    return result;
}

// Helper functions for enhanced analytics
function calculateWeightTrend(weights) {
    if (weights.length < 2) return 0;
    
    const values = weights.map(w => w.weight);
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}

function calculateAverageWeeklyChange(weights) {
    if (weights.length < 8) return 0;
    
    const recentWeights = weights.slice(0, 8);
    const weekSpan = Math.abs((recentWeights[0].date - recentWeights[recentWeights.length - 1].date) / (1000 * 60 * 60 * 24 * 7));
    const weightChange = recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight;
    
    return weekSpan > 0 ? weightChange / weekSpan : 0;
}

function getWorkoutTypeBreakdown(workouts) {
    const breakdown = {};
    workouts.forEach(w => {
        breakdown[w.type] = (breakdown[w.type] || 0) + 1;
    });
    return breakdown;
}

function calculateWorkoutFrequency(workouts) {
    if (workouts.length === 0) return 0;
    
    const dates = workouts.map(w => w.date.getTime());
    const daySpan = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
    const weekSpan = daySpan / 7;
    
    return weekSpan > 0 ? workouts.length / weekSpan : 0;
}

function getMonthlyWorkoutTotals(workouts) {
    const monthlyTotals = {};
    workouts.forEach(w => {
        const monthKey = `${w.date.getFullYear()}-${String(w.date.getMonth() + 1).padStart(2, '0')}`;
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + 1;
    });
    return monthlyTotals;
}

function calculateWorkoutConsistency(workouts) {
    if (workouts.length < 4) return 0;
    
    const last4Weeks = [];
    const today = new Date();
    
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7) - today.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekWorkouts = workouts.filter(w => 
            w.date >= weekStart && w.date <= weekEnd
        ).length;
        
        last4Weeks.unshift(weekWorkouts);
    }
    
    const average = last4Weeks.reduce((a, b) => a + b, 0) / last4Weeks.length;
    const variance = last4Weeks.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / last4Weeks.length;
    
    return Math.max(0, 100 - (variance * 10)); // Convert to percentage
}

function getRecentActivitySummary(workouts) {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recent = workouts.filter(w => w.date >= last30Days);
    
    return {
        workoutsLast30Days: recent.length,
        typesLast30Days: [...new Set(recent.map(w => w.type))],
        averagePerWeek: recent.length / 4.3
    };
}

function getPersonalBests(workouts) {
    const bests = {};
    
    // Running distance
    const runs = workouts.filter(w => w.type === 'run' && w.distance);
    if (runs.length > 0) {
        bests.longestRun = Math.max(...runs.map(r => r.distance));
    }
    
    // Walking duration
    const walks = workouts.filter(w => w.type === 'walk' && w.duration);
    if (walks.length > 0) {
        bests.longestWalk = Math.max(...walks.map(w => w.duration));
    }
    
    return bests;
}

function getDataDateRange() {
    const allDates = [
        ...weightData.map(w => w.date),
        ...workoutData.map(w => w.date),
        ...birthdayData.map(b => b.date)
    ];
    
    if (allDates.length === 0) return null;
    
    return {
        earliest: new Date(Math.min(...allDates.map(d => d.getTime()))).toISOString().split('T')[0],
        latest: new Date(Math.max(...allDates.map(d => d.getTime()))).toISOString().split('T')[0]
    };
}

function calculateTrackingStreak() {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        
        const hasData = weightData.some(w => 
            w.date.toDateString() === checkDate.toDateString()
        ) || workoutData.some(w => 
            w.date.toDateString() === checkDate.toDateString()
        );
        
        if (hasData) {
            streak++;
        } else if (i > 7) { // Allow some gaps in recent days
            break;
        }
    }
    
    return streak;
}

function getMostActiveWorkoutType() {
    const breakdown = getWorkoutTypeBreakdown(workoutData);
    return Object.entries(breakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';
}

function calculateAverageWorkoutsPerWeek() {
    if (workoutData.length === 0) return 0;
    
    const dates = workoutData.map(w => w.date.getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const weeks = Math.ceil((maxDate - minDate) / (7 * 24 * 60 * 60 * 1000)) || 1;
    
    return workoutData.length / weeks;
}

// Chat UI Functions
function showCurrentResponse(question, answer) {
    document.getElementById('current-question').textContent = question;
    document.getElementById('current-answer').textContent = answer;
    document.getElementById('current-response').style.display = 'block';
}

function showRecentExchanges() {
    const exchangesList = document.getElementById('exchanges-list');
    exchangesList.innerHTML = '';
    
    if (conversationHistory.length === 0) {
        exchangesList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; padding: 20px;">No recent exchanges yet.</p>';
    } else {
        for (let i = 0; i < conversationHistory.length; i += 2) {
            if (i + 1 < conversationHistory.length) {
                const question = conversationHistory[i].content;
                const answer = conversationHistory[i + 1].content;
                
                const exchangeDiv = document.createElement('div');
                exchangeDiv.style.cssText = `
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: background 0.3s ease;
                `;
                exchangeDiv.onmouseover = () => exchangeDiv.style.background = 'rgba(255,255,255,0.1)';
                exchangeDiv.onmouseout = () => exchangeDiv.style.background = 'rgba(255,255,255,0.05)';
                exchangeDiv.onclick = () => {
                    showCurrentResponse(question, answer);
                    hideRecentExchanges();
                };
                
                exchangeDiv.innerHTML = `
                    <div style="color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 8px; font-style: italic;">
                        "${question.length > 60 ? question.substring(0, 60) + '...' : question}"
                    </div>
                    <div style="color: white; font-size: 12px; line-height: 1.4;">
                        ${answer.length > 100 ? answer.substring(0, 100) + '...' : answer}
                    </div>
                `;
                
                exchangesList.appendChild(exchangeDiv);
            }
        }
    }
    
    document.getElementById('recent-exchanges').style.display = 'block';
    document.getElementById('view-history-btn').style.display = 'none';
}

function hideRecentExchanges() {
    document.getElementById('recent-exchanges').style.display = 'none';
    document.getElementById('view-history-btn').style.display = 'inline-block';
}

// Predictive Analytics Functions
function calculatePredictions() {
    const predictions = {};
    
    if (weightData.length >= 3) {
        const recentWeights = weightData.slice(0, 8);
        const weightTrend = calculateLinearTrend(recentWeights.map(w => w.weight));
        const daysSpan = Math.abs((recentWeights[0].date - recentWeights[recentWeights.length - 1].date) / (1000 * 60 * 60 * 24));
        const weeklyWeightChange = (weightTrend * 7) / (daysSpan / recentWeights.length);
        
        predictions.weightTrend = {
            weeklyChange: weeklyWeightChange.toFixed(2),
            currentWeight: weightData[0].weight,
            projectedIn30Days: (weightData[0].weight + (weeklyWeightChange * 4.3)).toFixed(1),
            projectedIn90Days: (weightData[0].weight + (weeklyWeightChange * 13)).toFixed(1)
        };
    }
    
    return predictions;
}

function calculateLinearTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}
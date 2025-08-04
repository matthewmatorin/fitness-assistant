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
    
    // Clear the input for security
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
    
    // Show loading state
    showCurrentResponse(question, 'Analyzing your fitness data...');
    document.getElementById('ask-question-btn').disabled = true;
    document.getElementById('ask-question-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    try {
        const response = await askChatGPT(question);
        showCurrentResponse(question, response);
        
        // Add to conversation history
        conversationHistory.push(
            { role: 'user', content: question },
            { role: 'assistant', content: response }
        );
        
        // Keep only last 10 messages to manage token usage
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
    
    // Reset button state
    document.getElementById('ask-question-btn').disabled = false;
    document.getElementById('ask-question-btn').innerHTML = '<i class="fas fa-paper-plane"></i> Ask';
    document.getElementById('chat-question').value = '';
}

async function askChatGPT(question) {
    // Smart data filtering based on question content
    const fitnessData = prepareFitnessDataForAI(question);
    
    // Check if this is a goal-setting or prediction question
    const isPredictiveQuery = question.toLowerCase().includes('goal') || 
                            question.toLowerCase().includes('predict') ||
                            question.toLowerCase().includes('when will') ||
                            question.toLowerCase().includes('how long') ||
                            question.toLowerCase().includes('target') ||
                            question.toLowerCase().includes('recommend');
    
    const systemPrompt = `You are a fitness analyst and coach for Matt. Analyze data and provide specific insights.

Guidelines:
- Be specific with numbers and dates
- Keep responses under 150 words
- Use bullet points for multiple insights
- Be encouraging but realistic
- Remember conversation context
- If asked follow-up questions, refer to previous discussion
${isPredictiveQuery ? `
PREDICTIVE MODE:
- Calculate trends and project future outcomes
- Set realistic timelines based on current patterns
- Provide specific, actionable goal recommendations
- Include weekly/monthly targets when relevant` : ''}`;

    // Build messages array with conversation history
    const messages = [
        {
            role: 'system',
            content: systemPrompt
        }
    ];

    // Add conversation history (limited to recent messages to save tokens)
    const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
    messages.push(...recentHistory);

    // Add current question with data and predictive context
    let userPrompt = `Data: ${JSON.stringify(fitnessData)}

Q: ${question}

Provide concise insights with specific numbers.`;

    if (isPredictiveQuery) {
        const predictions = calculatePredictions();
        userPrompt += `

CURRENT TRENDS:
${JSON.stringify(predictions)}

Use these trends to provide specific predictions and goal recommendations.`;
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
            max_tokens: isPredictiveQuery ? 200 : 150, // More tokens for predictions
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

// Daily Insight Generation
async function generateDashboardInsight() {
    if (!openaiApiKey || weightData.length < 3) {
        document.getElementById('daily-insight-text').textContent = 
            openaiApiKey ? 'Add more fitness data to get personalized insights...' : 
            'Configure your AI key in Settings to get personalized daily insights...';
        return;
    }
    
    try {
        document.getElementById('daily-insight-text').textContent = 'Generating your daily insight...';
        
        const predictions = calculatePredictions();
        const insightQuestion = "Give me a brief daily insight and one specific focus for today based on my fitness trends.";
        
        const insight = await askChatGPTDirect(insightQuestion, predictions);
        document.getElementById('daily-insight-text').textContent = insight;
        
    } catch (error) {
        console.log('Daily insight unavailable:', error.message);
        document.getElementById('daily-insight-text').textContent = 
            'Daily insights temporarily unavailable. Try asking a question in the Insights tab!';
    }
}

async function askChatGPTDirect(question, predictions) {
    const messages = [
        {
            role: 'system',
            content: 'You are a fitness coach. Provide a brief weekly insight and next week focus. Keep under 80 words.'
        },
        {
            role: 'user',
            content: `Trends: ${JSON.stringify(predictions)}

Q: ${question}

Provide encouraging weekly insight.`
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
            temperature: 0.8
        })
    });

    if (!response.ok) throw new Error('Prediction request failed');

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Data Preparation for AI
function prepareFitnessDataForAI(question = '') {
    const q = question.toLowerCase();
    
    // Determine what data to include based on question keywords
    const needsWeight = q.includes('weight') || q.includes('lose') || q.includes('gain') || q.includes('lbs') || q.includes('pounds');
    const needsWalking = q.includes('walk') || q.includes('walking');
    const needsRunning = q.includes('run') || q.includes('running');
    const needsWorkouts = q.includes('workout') || q.includes('exercise') || q.includes('lift') || q.includes('tennis') || needsWalking || needsRunning;
    const needsBirthdays = q.includes('birthday') || q.includes('anniversary');
    const needsGeneral = !needsWeight && !needsWorkouts && !needsBirthdays; // General questions get everything but limited
    
    const result = {};
    
    // Include weight data if needed
    if (needsWeight || needsGeneral) {
        result.weights = weightData.slice(0, needsGeneral ? 10 : 20).map(w => ({
            date: w.date.toISOString().split('T')[0],
            weight: w.weight,
            bodyFat: w.bodyFat || null
        }));
    }
    
    // Include workout data if needed
    if (needsWorkouts || needsGeneral) {
        let workouts = workoutData;
        
        // Filter by specific workout type if mentioned
        if (needsWalking && !needsRunning) {
            workouts = workoutData.filter(w => w.type === 'walk');
        } else if (needsRunning && !needsWalking) {
            workouts = workoutData.filter(w => w.type === 'run');
        } else if (q.includes('lift')) {
            workouts = workoutData.filter(w => w.type === 'lift');
        } else if (q.includes('tennis')) {
            workouts = workoutData.filter(w => w.type === 'tennis');
        }
        
        result.workouts = workouts.slice(0, needsGeneral ? 15 : 25).map(w => ({
            date: w.date.toISOString().split('T')[0],
            type: w.type,
            duration: w.duration || null,
            distance: w.distance || null,
            hrZone: w.hrZone || null
        }));
    }
    
    // Include birthday data if needed
    if (needsBirthdays) {
        const today = new Date();
        const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
        result.birthdays = birthdayData.filter(b => {
            const thisYearBirthday = new Date(today.getFullYear(), b.date.getMonth(), b.date.getDate());
            return thisYearBirthday >= today && thisYearBirthday <= thirtyDaysFromNow;
        }).map(b => ({
            name: b.name,
            date: b.date.toISOString().split('T')[0],
            age: b.age
        }));
    }
    
    // Always include basic summary for context
    result.summary = {
        totalWeights: weightData.length,
        totalWorkouts: workoutData.length,
        currentWeight: weightData.length > 0 ? weightData[0].weight : null,
        recentWorkoutTypes: [...new Set(workoutData.slice(0, 10).map(w => w.type))]
    };
    
    return result;
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
        // Group conversations into pairs
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
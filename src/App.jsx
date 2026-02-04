import React, { useState, useEffect, useMemo } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// ---------------------------------
// 1. 常量和配置
// ---------------------------------

// Gemini API配置
// 将来您可以在这里替换为您自己的API密钥（如果需要）
// 目前，空字符串将使用画布环境中提供的默认凭据。
const API_KEY = ""; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;
// const API_URL = '/api/send_to_pc';

// 五维的定义
const STAT_NAMES = {
  diligence: "毅力",
  knowledge: "知识",
  courage: "勇气",
  understanding: "宽容",
  expression: "表达力",
};

// ---------------------------------
// 2. 帮助函数 (Helpers)
// ---------------------------------

/**
 * 指数退避重试 Fetch
 */
const fetchWithBackoff = async (url, options, retries = 5, delay = 1000) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        // console.warn(`Retrying request (attempts left: ${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithBackoff(url, options, retries - 1, delay * 2);
      }
      throw new Error(`API request failed with status ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
};

/**
 * 调用 Gemini API 来计算五维提升
 * @param {string} activity - 用户输入的活动
 * @param {string} feeling - 用户输入的感受
 * @returns {Promise<object>} - 包含五维提升点数的对象
 */
const callAiModel = async (activity, feeling) => {
  const systemPrompt = `你是一个模拟《女神异闻录》系列中五维系统的AI助手。
请根据用户提交的“今日事项”和“完成感受”，分析这项活动对用户的五维（毅力, 知识, 勇气, 宽容, 表达力）带来了哪些提升。
- 事项: ${activity}
- 感受: ${feeling}

请评估每一项的提升点数，范围从0到5。
请只返回一个JSON对象，格式如下：
{ "diligence": 0, "knowledge": 0, "courage": 0, "understanding": 0, "expression": 0 }
不要添加任何markdown标记或解释性文字。`;

  const payload = {
    contents: [{ parts: [{ text: systemPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          diligence: { type: "NUMBER", description: "毅力" },
          knowledge: { type: "NUMBER", description: "知识" },
          courage: { type: "NUMBER", description: "勇气" },
          understanding: { type: "NUMBER", description: "宽容" },
          expression: { type: "NUMBER", description: "表达力" },
        },
        required: ["diligence", "knowledge", "courage", "understanding", "expression"],
      },
    },
  };

  try {
    const result = await fetchWithBackoff(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    console.log("API响应:", result);

    const candidate = result.candidates?.[0];
    if (candidate && candidate.content?.parts?.[0]?.text) {
      const jsonText = candidate.content.parts[0].text;
      return JSON.parse(jsonText);
    } else {
      console.error("无效的API响应:", result);
      throw new Error("AI未能返回有效的五维数据。");
    }
  } catch (error) {
    console.error("AI计算失败:", error);
    // 返回一个默认的0值，以防止应用崩溃
    return { diligence: 0, knowledge: 0, courage: 0, understanding: 0, expression: 0 };
  }
};

// ---------------------------------
// 3. 自定义Hooks (用于本地存储)
// ---------------------------------

/**
 * 一个用于在 localStorage 中持久化状态的 Hook
 * @param {string} key - localStorage的键
 * @param {*} defaultValue - 初始默认值
 */
function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    let storedValue = null;
    try {
      storedValue = localStorage.getItem(key);
    } catch (e) {
      console.error("无法访问localStorage:", e);
    }
    
    if (storedValue) {
      try {
        return JSON.parse(storedValue);
      } catch (e) {
        console.error("解析localStorage数据失败:", e);
        return defaultValue;
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`无法保存到localStorage (key: ${key}):`, e);
    }
  }, [key, value]);

  return [value, setValue];
}


// ---------------------------------
// 4. React 组件
// ---------------------------------

// --- 4.1 图标组件 ---

const HomeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6-4a1 1 0 001 1h2a1 1 0 001-1v-1a1 1 0 00-1-1h-2a1 1 0 00-1 1v1z" /></svg>
);

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);

const StatsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
);

const SettingsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

// --- 4.2 底部导航栏 ---

const BottomNav = ({ activeScreen, setActiveScreen }) => {
  const navItems = [
    { id: 'home', label: '主页', icon: <HomeIcon /> },
    { id: 'calendar', label: '日历', icon: <CalendarIcon /> },
    { id: 'stats', label: '五维', icon: <StatsIcon /> },
    { id: 'settings', label: '设置', icon: <SettingsIcon /> },
  ];

  return (
    <nav className="flex-shrink-0 w-full bg-gray-900 border-t border-gray-700">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveScreen(item.id)}
            className={`flex flex-col items-center justify-center w-full ${
              activeScreen === item.id ? 'text-blue-400' : 'text-gray-500'
            } hover:text-blue-300 transition-colors duration-200`}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// --- 4.3 屏幕组件：主页 ---

const HomeScreen = ({ setActiveScreen, playerStats }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "夜深了...还在记录吗？";
    if (hour < 12) return "早上好！";
    if (hour < 18) return "下午好。";
    return "晚上好。";
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h1 className="text-3xl font-bold text-white mb-2">{getGreeting()}</h1>
      <p className="text-lg text-gray-400 mb-8">今天有什么新的进展吗？</p>

      <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4 text-white">当前五维总览</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          {Object.entries(playerStats).map(([key, value]) => (
            <div key={key} className="bg-gray-700 p-3 rounded-lg">
              <div className="text-sm text-blue-300">{STAT_NAMES[key]}</div>
              <div className="text-2xl font-bold text-white">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center">
        <button
          onClick={() => setActiveScreen('add')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-10 rounded-full text-2xl shadow-xl transform transition-transform hover:scale-105"
          style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.2)' }}
        >
          + 记录今日事项
        </button>
      </div>
    </div>
  );
};

// --- 4.4 屏幕组件：添加事项 ---

const AddActivityScreen = ({ onSave, setActiveScreen }) => {
  const [activity, setActivity] = useState("");
  const [feeling, setFeeling] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activity.trim() || !feeling.trim()) {
      setError("事项和感受都不能为空哦。");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const gains = await callAiModel(activity, feeling);
      
      const newEntry = {
        id: new Date().toISOString() + Math.random(), // 确保ID唯一
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        activity,
        feeling,
        gains,
      };

      onSave(newEntry);
      setActivity("");
      setFeeling("");
      setActiveScreen('stats'); // 提交后跳转到五维界面看提升
      
    } catch (err) {
      console.error(err);
      setError("AI计算失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center mb-6">
        <button onClick={() => setActiveScreen('home')} className="text-blue-400 mr-4">
          &lt; 返回
        </button>
        <h1 className="text-2xl font-bold text-white">记录新事项</h1>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
          <p className="text-white text-lg mt-4">AI正在计算您的五维提升...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-800 border border-red-600 text-red-200 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-300 mb-2" htmlFor="activity">
            今天干了什么？
          </label>
          <input
            id="activity"
            type="text"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="例如：看了一部侦探电影"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6 flex-grow flex flex-col">
          <label className="block text-lg font-medium text-gray-300 mb-2" htmlFor="feeling">
            有什么感受或想法？
          </label>
          <textarea
            id="feeling"
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            placeholder="例如：情节很棒，学到了一些逻辑推理。感觉自己更敢于表达了。"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow min-h-[150px]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-black font-bold py-4 px-4 rounded-lg text-lg shadow-lg transition-all duration-200 disabled:bg-gray-600 disabled:opacity-50"
        >
          {isLoading ? "计算中..." : "提交并查看五维提升"}
        </button>
      </form>
    </div>
  );
};

// --- 4.5 屏幕组件：日历 ---

const CalendarScreen = ({ allEntries }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const entriesByDate = allEntries.reduce((acc, entry) => {
      acc[entry.date] = true;
      return acc;
    }, {});

    const todayStr = new Date().toISOString().split('T')[0];

    let days = [];
    // 填充空白
    for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) {
      days.push(null);
    }
    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateStr,
        isToday: dateStr === todayStr,
        hasEntry: !!entriesByDate[dateStr],
      });
    }
    return days;
  }, [currentDate, allEntries]);

  const changeMonth = (offset) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const selectedDateEntries = useMemo(() => {
    return allEntries
      .filter(entry => entry.date === selectedDate)
      .sort((a, b) => new Date(b.id) - new Date(a.id)); // 按提交时间排序
  }, [allEntries, selectedDate]);

  return (
    <div className="p-4 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-white mb-4">活动日历</h1>
      
      {/* 月份控制器 */}
      <div className="flex justify-between items-center mb-4 p-2 bg-gray-800 rounded-lg">
        <button onClick={() => changeMonth(-1)} className="text-blue-400 p-2 rounded-lg hover:bg-gray-700">&lt; 上一月</button>
        <h2 className="text-xl font-semibold text-white">
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </h2>
        <button onClick={() => changeMonth(1)} className="text-blue-400 p-2 rounded-lg hover:bg-gray-700">下一月 &gt;</button>
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1 text-center mb-4">
        {['一', '二', '三', '四', '五', '六', '日'].map(day => (
          <div key={day} className="text-xs font-bold text-gray-500 p-1">{day}</div>
        ))}
        {daysInMonth.map((day, index) => (
          <div
            key={index}
            onClick={() => day && setSelectedDate(day.dateStr)}
            className={`p-1 h-10 flex items-center justify-center rounded-lg cursor-pointer transition-all ${
              day ? 'hover:bg-gray-700' : 'bg-transparent'
            } ${
              day && day.dateStr === selectedDate ? 'bg-blue-600 text-white' : 
              day && day.isToday ? 'bg-gray-700 text-white' : 
              'text-gray-300'
            }`}
          >
            {day && (
              <div className="relative w-full h-full flex items-center justify-center">
                <span>{day.day}</span>
                {day.hasEntry && (
                  <div className="absolute bottom-1 w-1 h-1 bg-blue-400 rounded-full"></div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 选中日期的记录 */}
      <div className="flex-grow overflow-y-auto bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">
          {selectedDate} 的记录
        </h3>
        {selectedDateEntries.length > 0 ? (
          <ul className="space-y-3">
            {selectedDateEntries.map((entry) => (
              <li key={entry.id} className="bg-gray-700 p-3 rounded-lg shadow">
                <p className="font-semibold text-white text-lg">{entry.activity}</p>
                <p className="text-gray-300 text-sm mt-1 mb-2">{entry.feeling}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {Object.entries(entry.gains).map(([key, value]) => 
                    value > 0 && (
                      <span key={key} className="bg-blue-800 text-blue-200 px-2 py-0.5 rounded-full">
                        {STAT_NAMES[key]} +{value}
                      </span>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center mt-6">这一天没有记录。</p>
        )}
      </div>
    </div>
  );
};

// --- 4.6 屏幕组件：五维统计 ---

const StatBar = ({ name, value, color }) => {
  const level = Math.floor(value / 10); // 每10点升一级
  const progress = (value % 10) * 10; // 当前等级的进度百分比
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xl font-semibold text-white">{name}</span>
        <div className="flex items-baseline">
          <span className="text-sm text-gray-400 mr-1">Lv.</span>
          <span className="text-2xl font-bold text-white">{level}</span>
          <span className="text-lg text-gray-400 ml-2">(总点数: {value})</span>
        </div>
      </div>
      <div className="w-full bg-gray-900 rounded-full h-4 overflow-hidden border border-gray-700">
        <div
          className={`h-4 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${progress}%`, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          <span className="text-xs font-medium text-white px-2">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

const StatsScreen = ({ playerStats }) => {
  const statColors = {
    diligence: "bg-pink-500",
    knowledge: "bg-blue-500",
    courage: "bg-red-500",
    understanding: "bg-green-500",
    expression: "bg-yellow-500",
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-white mb-6">我的五维</h1>
      <div className="space-y-5">
        {Object.entries(playerStats).map(([key, value]) => (
          <StatBar 
            key={key} 
            name={STAT_NAMES[key]} 
            value={value} 
            color={statColors[key]}
          />
        ))}
      </div>
    </div>
  );
};

// --- 4.7 屏幕组件：设置 ---

const SettingsScreen = ({ allEntries, playerStats, setAllEntries, setPlayerStats }) => {
  const [message, setMessage] = useState(null);

  const handleExport = async () => {
    setMessage(null);
    try {
      const data = {
        allEntries,
        playerStats,
        exportDate: new Date().toISOString(),
      };
      const jsonString = JSON.stringify(data, null, 2);
      const fileName = `persona_data_${new Date().toISOString().split('T')[0]}.json`;

      // 使用Capacitor Filesystem API
      const result = await Filesystem.writeFile({
        path: fileName,
        data: jsonString,
        directory: Directory.Documents, // 保存到应用"文档"目录
        encoding: Encoding.UTF8,
      });

      // result.uri 会返回文件的真实路径, e.g., "file:///..."
      // console.log('File saved at:', result.uri);
      
      setMessage({ type: 'success', text: `数据已成功导出！保存位置: 文档/${fileName}` });
    } catch (e) {
      console.error("导出失败:", e);
      // 处理可能的权限问题或错误
      let errorText = '导出失败，请检查控制台。';
      if (e.message.includes("permission")) {
        errorText = '导出失败：需要文件存储权限。';
      }
      setMessage({ type: 'error', text: errorText });
    }
  };

  const handleImport = (event) => {
    setMessage(null);
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.allEntries && data.playerStats) {
          setAllEntries(data.allEntries);
          setPlayerStats(data.playerStats);
          setMessage({ type: 'success', text: '数据导入成功！' });
        } else {
          throw new Error("无效的文件格式。");
        }
      } catch (e) {
        console.error("导入失败:", e);
        setMessage({ type: 'error', text: `导入失败: ${e.message}` });
      }
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: '读取文件失败。' });
    };
    reader.readAsText(file);
    
    // 重置input，以便下次可以导入同名文件
    event.target.value = null;
  };

  return (
    <div className="p-6 h-full">
      <h1 className="text-3xl font-bold text-white mb-6">设置</h1>

      {message && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* 导出 */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-2">导出数据</h2>
          <p className="text-gray-400 text-sm mb-4">
            将您的所有记录和五维数据保存为 JSON 文件。
          </p>
          <button
            onClick={handleExport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            导出
          </button>
        </div>

        {/* 导入 */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-2">导入数据</h2>
          <p className="text-gray-400 text-sm mb-4">
            从 JSON 文件恢复您的数据。注意：这将覆盖当前所有数据！
          </p>
          <input
            type="file"
            id="import-file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <label
            htmlFor="import-file"
            className="w-full text-center block cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            选择文件并导入
          </label>
        </div>
      </div>
    </div>
  );
};


// ---------------------------------
// 5. 主应用组件 (App)
// ---------------------------------

export default function App() {
  const [activeScreen, setActiveScreen] = useState('home');
  const [allEntries, setAllEntries] = useLocalStorage('personaDailyEntries', []);
  const [playerStats, setPlayerStats] = useLocalStorage('personaDailyStats', {
    diligence: 0,
    knowledge: 0,
    courage: 0,
    understanding: 0,
    expression: 0,
  });

  // 当添加新条目时，更新条目列表和五维总数
  const handleSaveEntry = (newEntry) => {
    setAllEntries(prev => [...prev, newEntry]);
    
    setPlayerStats(prev => {
      const newStats = { ...prev };
      for (const key in newEntry.gains) {
        newStats[key] = (newStats[key] || 0) + newEntry.gains[key];
      }
      return newStats;
    });
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen setActiveScreen={setActiveScreen} playerStats={playerStats} />;
      case 'add':
        return <AddActivityScreen onSave={handleSaveEntry} setActiveScreen={setActiveScreen} />;
      case 'calendar':
        return <CalendarScreen allEntries={allEntries} />;
      case 'stats':
        return <StatsScreen playerStats={playerStats} />;
      case 'settings':
        return <SettingsScreen 
                  allEntries={allEntries} 
                  playerStats={playerStats} 
                  setAllEntries={setAllEntries} 
                  setPlayerStats={setPlayerStats} 
                />;
      default:
        return <HomeScreen setActiveScreen={setActiveScreen} playerStats={playerStats} />;
    }
  };

  return (
    <main className="font-sans antialiased">
      {/* 模拟手机外壳 */}
      <div className="max-w-md mx-auto h-screen bg-gray-900 text-white flex flex-col shadow-2xl overflow-hidden">
        {/* 屏幕内容区 */}
        <div className="flex-grow overflow-y-auto">
          {renderScreen()}
        </div>
        
        {/* '添加' 按钮是一个浮动按钮，不占用导航栏位置 */}
        {activeScreen !== 'add' && (
          <button
            onClick={() => setActiveScreen('add')}
            className="absolute bottom-20 right-5 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all transform hover:scale-110 z-30"
            aria-label="添加新事项"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </button>
        )}

        {/* 底部导航 */}
        <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      </div>
    </main>
  );
}


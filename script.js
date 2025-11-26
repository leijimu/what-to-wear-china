/**
 * ===========================================
 * API 配置 (高德地图 AMap)
 * ===========================================
 */
// ⚠️ 替换为您在高德开放平台申请的 Web 服务 Key
const API_KEY = 'ffa3d2b9aad5c5142d966909485423c5'; 

// 高德天气查询接口
const BASE_WEATHER_URL = 'https://restapi.amap.com/v3/weather/weatherInfo'; 
// 高德行政区划查询接口 (用于根据城市名查找 Adcode)
const BASE_DISTRICT_URL = 'https://restapi.amap.com/v3/config/district'; 


/**
 * ===========================================
 * 页面初始化和城市选择
 * ===========================================
 */

/**
 * 页面初始化函数：设置默认城市并自动查询
 */
function initApp() {
    // 页面加载时隐藏结果区域，等待数据加载
    document.getElementById('results-section').style.display = 'none';

    const defaultCity = '北京';
    
    // 1. 设置输入框的值
    document.getElementById('city-input').value = defaultCity;

    // 2. 自动执行查询
    // 延迟执行查询，确保所有DOM元素和样式都已加载完成
    setTimeout(() => {
        fetchOutfitSuggestion();
    }, 100); 
}


/**
 * 城市选择逻辑：将热门城市的名称放入输入框并触发查询
 * @param {string} cityCode - 城市的英文代码
 */
function selectCity(cityCode) {
    const cityMap = {
        'beijing': '北京',
        'shanghai': '上海',
        'guangzhou': '广州',
        'chengdu': '成都',
        'urumqi': '乌鲁木齐',
        'sanya': '三亚',
        'qingdao': '青岛',
        'xian': '西安',
        'hangzhou': '杭州',
        'chongqing': '重庆',
        'kunming': '昆明',
        'lhasa': '拉萨'
    };
    
    const cityName = cityMap[cityCode] || '';
    document.getElementById('city-input').value = cityName;
    
    // 自动查询
    fetchOutfitSuggestion();
}


/**
 * ===========================================
 * 核心逻辑：温度计算与建议
 * ===========================================
 */

/**
 * 核心逻辑：根据温度获取服装建议
 * @param {number} temp - 实时温度 (°C)
 * @returns {object} - 包含建议和描述的对象
 */
function getSuggestionByTemp(temp) {
    if (temp >= 26) {
        return {
            title: "盛夏清凉装",
            items: ["T恤", "短裤/短裙", "凉鞋", "防晒霜"],
            tip: "炎热天气，注意补充水分和防晒，选择透气棉麻衣物。",
            tempRange: "26°C 及以上"
        };
    } else if (20 <= temp < 26) {
        return {
            title: "舒适春秋装",
            items: ["长袖衬衫", "薄外套/针织衫", "牛仔裤", "休闲鞋"],
            tip: "早晚温差较大，建议携带一件薄外套，以防降温。",
            tempRange: "20°C ~ 25°C"
        };
    } else if (15 <= temp < 20) {
        return {
            title: "初秋保暖装",
            items: ["夹克/风衣", "卫衣", "毛衣", "运动鞋"],
            tip: "体感微凉，需要适当保暖，尤其注意腹部和关节。",
            tempRange: "15°C ~ 19°C"
        };
    } else if (5 <= temp < 15) {
        return {
            title: "深秋冬过渡装",
            items: ["厚外套", "羊毛衫", "保暖内衣", "皮靴/雪地靴"],
            tip: "体感寒冷，多穿几层衣物保持温度，防寒是重点。",
            tempRange: "5°C ~ 14°C"
        };
    } else { // temp < 5
        return {
            title: "寒冬全副武装",
            items: ["羽绒服/大衣", "围巾/帽子", "手套", "加绒裤"],
            tip: "极寒天气，务必做好头部和四肢的保暖，避免长时间户外活动。",
            tempRange: "5°C 以下"
        };
    }
}


/**
 * ===========================================
 * 核心函数：获取高德 Adcode 和天气数据
 * ===========================================
 */

/**
 * 辅助函数：通过城市名称查询高德 Adcode (全国查询的关键)
 * @param {string} cityName - 用户输入的城市名称（例如：'武汉', '拉萨'）
 * @returns {string|null} - 城市 Adcode 或 null
 */
async function getAdcodeByCityName(cityName) {
    // 高德行政区划 API: subdistrict=0 只返回当前级别，extensions=base 简化数据
    const url = `${BASE_DISTRICT_URL}?keywords=${cityName}&key=${API_KEY}&subdistrict=0&extensions=base`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === '1' && data.districts.length > 0) {
            // 返回第一个匹配到的行政区划的 Adcode
            return data.districts[0].adcode; 
        }
        return null;
    } catch (error) {
        console.error("Adcode Fetch Error:", error);
        return null;
    }
}


/**
 * 核心查询函数：修改为先查 Adcode，再查天气
 */
async function fetchOutfitSuggestion() {
    const cityName = document.getElementById('city-input').value.trim();
    if (!cityName) {
        alert("请输入一个城市名称！");
        return;
    }

    const resultsSection = document.getElementById('results-section');
    resultsSection.innerHTML = '<h2>正在查询城市编码...</h2>';
    resultsSection.style.display = 'block';

    // 1. (NEW) 根据城市名动态获取 Adcode
    const cityAdcode = await getAdcodeByCityName(cityName);
    
    if (!cityAdcode) {
        alert(`抱歉，城市【${cityName}】的地理编码（Adcode）未找到，请检查城市名称是否输入正确（如：上海市、武汉市）。`);
        resultsSection.style.display = 'none';
        return;
    }

    resultsSection.innerHTML = '<h2>已获取编码，正在查询天气...</h2>';

    try {
        // 2. 构造天气 API URL (使用动态获取的 Adcode)
        const url = `${BASE_WEATHER_URL}?city=${cityAdcode}&key=${API_KEY}&extensions=base`;
        
        // 3. 发起 API 请求
        const response = await fetch(url);
        const data = await response.json();

        // 4. 检查 API 响应是否成功 (状态码 10000 表示成功)
        if (data.status !== '1' || !data.lives || data.lives.length === 0) {
            alert(`查询失败，高德API返回错误信息: ${data.info || '未知错误'}`);
            resultsSection.style.display = 'none';
            return;
        }

        // 5. 解析所需的天气数据 (高德返回的数据结构)
        const liveData = data.lives[0];
        
        const currentTemp = parseInt(liveData.temperature);
        
        const weatherData = {
            // 高德实况只返回当前温度，这里使用当前温度进行 min/max 简单估算
            min: currentTemp - 2, 
            max: currentTemp + 2,
            current: currentTemp, // 实时温度
            weather: liveData.weather, // 天气现象描述 (如: 晴)
            wind: liveData.winddirection + liveData.windpower + '级' // 风向 + 风力
        };
        
        // 6. 根据实时温度获取服装建议
        const suggestion = getSuggestionByTemp(weatherData.current);

        // 7. 渲染结果
        renderResults(liveData.city || cityName, weatherData, suggestion);

    } catch (error) {
        console.error("Fetch Error:", error);
        alert("网络请求失败，请检查您的网络连接或 API 配置。");
        resultsSection.style.display = 'none';
    }
}


/**
 * ===========================================
 * 渲染结果到页面
 * ===========================================
 */

/**
 * 渲染结果到页面
 * @param {string} cityName - 城市名
 * @param {object} weatherData - 天气数据
 * @param {object} suggestion - 服装建议数据
 */
function renderResults(cityName, weatherData, suggestion) {
    const resultsSection = document.getElementById('results-section');
    resultsSection.innerHTML = ''; // 清空之前的内容
    resultsSection.style.display = 'block';

    // 1. 渲染天气卡片
    // 根据温度调整渐变色，模拟冷暖
    const isCold = weatherData.current < 10;
    const gradientStart = isCold ? '#004a99' : '#007bff';
    const gradientEnd = isCold ? '#4169e1' : '#28a745';

    const weatherCardHTML = `
        <div id="weather-card" class="weather-card" style="background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});">
            <div class="weather-info">
                <h3>${cityName}</h3>
                <p class="temp-range">${weatherData.min}°C ~ ${weatherData.max}°C</p>
                <p class="desc">${weatherData.weather} / ${weatherData.wind}</p>
            </div>
            <div class="info-alert">
                ℹ️ 当前实时温度：${weatherData.current}°C。适合 ${suggestion.tempRange} 的穿搭。
            </div>
        </div>
    `;
    resultsSection.insertAdjacentHTML('beforeend', weatherCardHTML);

    // 2. 渲染推荐穿搭
    const outfitItemsHTML = suggestion.items.map(item => `
        <div class="outfit-item">
            <div class="placeholder"></div>
            <p>${item}</p>
        </div>
    `).join('');

    const suggestionsHTML = `
        <section id="suggestions" class="suggestions">
            <h2>推荐穿搭</h2>
            <div class="outfit-grid">
                ${outfitItemsHTML}
            </div>
        </section>
    `;

    // 3. 渲染出行贴士
    const tipsHTML = `
        <section id="tips" class="tips">
            <h2>出行贴士</h2>
            <div class="tip-grid">
                <div class="special-tip">
                    <span class="emoji">🧥</span>
                    <h4>穿搭重点</h4>
                    <p>${suggestion.tip}</p>
                </div>
                <div class="special-tip">
                    <span class="emoji">☔</span>
                    <h4>今日天气</h4>
                    <p>${weatherData.weather}，${weatherData.weather.includes('雨') ? '出门请带伞。' : '天气适宜。'}</p>
                </div>
                <div class="special-tip">
                    <span class="emoji">💨</span>
                    <h4>空气情况</h4>
                    <p>今日风力${weatherData.wind}，需注意防风。</p>
                </div>
                <div class="special-tip">
                    <span class="emoji">☀️</span>
                    <h4>光照/紫外线</h4>
                    <p>光照${weatherData.weather.includes('晴') ? '较强' : '一般'}，注意皮肤护理和防晒。</p>
                </div>
            </div>
        </section>
    `;
    
    // 创建左右布局容器 (用于包裹穿搭和贴士) 
    const layoutHTML = `
        <div class="content-layout">
            <div class="suggestions-col">
                ${suggestionsHTML}
            </div>
            <div class="tips-col">
                ${tipsHTML}
            </div>
        </div>
    `;

    resultsSection.insertAdjacentHTML('beforeend', layoutHTML); 

    // 平滑滚动到结果区域，确保用户看到结果
    document.getElementById('weather-card').scrollIntoView({ behavior: 'smooth' });
}

// 页面加载完成后调用初始化函数
document.addEventListener('DOMContentLoaded', initApp);

/**
 * ===========================================
 * ⬇️ 用户体验优化：键盘回车查询 ⬇️
 * ===========================================
 */
document.addEventListener('DOMContentLoaded', () => {
    const cityInput = document.getElementById('city-input');
    
    // 监听键盘按键抬起事件
    cityInput.addEventListener('keyup', (event) => {
        // 检查按下的键是否是 'Enter' (回车键)
        if (event.key === 'Enter') {
            // 阻止默认行为
            event.preventDefault(); 
            
            // 调用查询函数
            fetchOutfitSuggestion();
        }
    });
});

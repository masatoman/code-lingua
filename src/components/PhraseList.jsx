import React, { useState, useEffect, useRef } from 'react';
import { phrases, categories } from '../data/phrases.js';

const PhraseList = ({ darkMode, setDarkMode }) => {
  const [selectedCategory, setSelectedCategory] = useState('Console Errors');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [formStatus, setFormStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [favorites, setFavorites] = useState(new Set());
  const [userRatings, setUserRatings] = useState({});
  const [ratingAggregates, setRatingAggregates] = useState({});
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const formRef = useRef(null);
  const recaptchaRef = useRef(null);

  // ローカルストレージからお気に入りとユーザー評価を読み込み
  useEffect(() => {
    const savedFavorites = localStorage.getItem('code-lingua-favorites');
    const savedUserRatings = localStorage.getItem('code-lingua-user-ratings');
    
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      } catch (error) {
        console.error('お気に入りの読み込みに失敗しました:', error);
      }
    }
    
    if (savedUserRatings) {
      try {
        const parsed = JSON.parse(savedUserRatings);
        setUserRatings(parsed);
        
        // 保存されたユーザー評価から集計を再計算
        Object.keys(parsed).forEach(id => {
          updateRatingAggregates(parseInt(id), parsed[id].rating);
        });
      } catch (error) {
        console.error('ユーザー評価の読み込みに失敗しました:', error);
      }
    }
  }, []);

  // お気に入りとユーザー評価をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('code-lingua-favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('code-lingua-user-ratings', JSON.stringify(userRatings));
  }, [userRatings]);

  // レート制限: 1分間に3回まで
  const RATE_LIMIT = {
    maxSubmissions: 3,
    timeWindow: 60000 // 1分
  };

  // セッションストレージから送信回数を取得
  useEffect(() => {
    const stored = sessionStorage.getItem('formSubmitCount');
    const lastTime = sessionStorage.getItem('formLastSubmitTime');
    
    if (stored && lastTime) {
      const timeDiff = Date.now() - parseInt(lastTime);
      if (timeDiff < RATE_LIMIT.timeWindow) {
        setSubmitCount(parseInt(stored));
        setLastSubmitTime(parseInt(lastTime));
      } else {
        // 時間枠が過ぎている場合はリセット
        sessionStorage.removeItem('formSubmitCount');
        sessionStorage.removeItem('formLastSubmitTime');
        setSubmitCount(0);
        setLastSubmitTime(0);
      }
    }
  }, []);

  const filteredPhrases = phrases.filter(phrase => {
    const matchesCategory = phrase.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
                         phrase.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         phrase.japanese.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         phrase.context.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         phrase.solution.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorites = !showFavoritesOnly || favorites.has(phrase.id);
    return matchesCategory && matchesSearch && matchesFavorites;
  });

  const isExpanded = (id) => expandedIds.has(id);

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllVisible = () => {
    const allVisibleIds = filteredPhrases.map(p => p.id);
    setExpandedIds(new Set(allVisibleIds));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // 簡単なフィードバック（実際のアプリではトースト通知など）
    alert('コピーしました！');
  };

  // お気に入り切り替え
  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ユーザー評価の追加・更新
  const addUserRating = (id, newRating) => {
    setUserRatings(prev => ({
      ...prev,
      [id]: {
        rating: newRating,
        timestamp: new Date().toISOString()
      }
    }));
    
    // 評価集計を更新
    updateRatingAggregates(id, newRating);
  };

  // ユーザー評価の削除
  const removeUserRating = (id) => {
    setUserRatings(prev => {
      const newRatings = { ...prev };
      delete newRatings[id];
      return newRatings;
    });
    
    // 評価集計を更新（ユーザー評価なし）
    updateRatingAggregates(id, null);
  };

  // 評価集計の更新
  const updateRatingAggregates = (id, userRating) => {
    const phrase = phrases.find(p => p.id === id);
    if (!phrase) return;

    let totalUserRatings = 0;
    let userAverageRating = 0;
    let combinedRating = phrase.rating;

    if (userRating !== null) {
      totalUserRatings = 1;
      userAverageRating = userRating;
      
      // 既存評価とユーザー評価の組み合わせ
      // 既存評価の重み: 0.7, ユーザー評価の重み: 0.3
      combinedRating = (phrase.rating * 0.7) + (userRating * 0.3);
    }

    setRatingAggregates(prev => ({
      ...prev,
      [id]: {
        totalUserRatings,
        userAverageRating,
        combinedRating: Math.round(combinedRating * 10) / 10 // 小数点1桁に丸める
      }
    }));
  };

  // 星評価コンポーネント
  const StarRating = ({ rating, onRatingChange, readonly = false }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => !readonly && onRatingChange(star)}
            disabled={readonly}
            className={`text-lg transition-colors ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            {star <= rating ? '★' : '☆'}
          </button>
        ))}
        {!readonly && (
          <span className="text-xs text-gray-500 ml-2">
            {rating}/5
          </span>
        )}
      </div>
    );
  };

  // 入力値の検証
  const validateForm = (formData) => {
    const errors = [];
    
    // 名前の検証
    const name = formData.get('name').trim();
    if (name.length < 2 || name.length > 50) {
      errors.push('お名前は2文字以上50文字以下で入力してください');
    }
    if (!/^[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+$/.test(name)) {
      errors.push('お名前に使用できない文字が含まれています');
    }
    
    // メールアドレスの検証
    const email = formData.get('email').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('有効なメールアドレスを入力してください');
    }
    
    // メッセージの検証
    const message = formData.get('message').trim();
    if (message.length < 10 || message.length > 1000) {
      errors.push('メッセージは10文字以上1000文字以下で入力してください');
    }
    
    return errors;
  };

  // レート制限チェック
  const checkRateLimit = () => {
    const now = Date.now();
    const timeDiff = now - lastSubmitTime;
    
    if (timeDiff < RATE_LIMIT.timeWindow && submitCount >= RATE_LIMIT.maxSubmissions) {
      const remainingTime = Math.ceil((RATE_LIMIT.timeWindow - timeDiff) / 1000);
      throw new Error(`送信回数が上限に達しました。${remainingTime}秒後に再試行してください。`);
    }
    
    return true;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // レート制限チェック
      checkRateLimit();
      
      // 重複送信防止
      if (isSubmitting) {
        return;
      }
      
      setIsSubmitting(true);
      setFormStatus('sending');
      
      const formData = new FormData(e.target);
      
      // 入力値検証
      const validationErrors = validateForm(formData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }
      
      // ボットフィールドチェック
      if (formData.get('bot-field')) {
        throw new Error('ボットによる送信が検出されました');
      }
      
      // 送信処理
      const response = await fetch('/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: new URLSearchParams(formData).toString()
      });
      
      if (response.ok) {
        // 成功時の処理
        setFormStatus('success');
        setSubmitCount(prev => prev + 1);
        setLastSubmitTime(Date.now());
        
        // セッションストレージに保存
        sessionStorage.setItem('formSubmitCount', submitCount + 1);
        sessionStorage.setItem('formLastSubmitTime', Date.now().toString());
        
        // フォームリセット
        e.target.reset();
        
        // 3秒後にメッセージを消す
        setTimeout(() => setFormStatus(''), 3000);
      } else {
        throw new Error(`送信に失敗しました (${response.status})`);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setFormStatus('error');
      
      // エラーメッセージを表示
      if (error.message.includes('送信回数が上限')) {
        setFormStatus('rate-limit');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <div className="flex justify-between items-center mb-4">
          <div></div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode 
                ? 'bg-gray-700 text-white hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {darkMode ? '🌞 ライトモード' : '🌙 ダークモード'}
          </button>
        </div>
        <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Code Lingua
        </h1>
        <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
          フロントエンドエンジニア向け英語フレーズ集
        </p>
      </div>

      {/* 検索バー */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="フレーズ、日本語、解決方法を検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
      </div>

      {/* カテゴリタブ */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-500 text-white'
                : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
        
        {/* お気に入りフィルター */}
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showFavoritesOnly
              ? 'bg-yellow-500 text-white'
              : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showFavoritesOnly ? '★ お気に入りのみ' : '☆ お気に入り'}
        </button>
      </div>

      {/* 統計情報 */}
      <div className={`mb-4 p-4 rounded-lg ${
        darkMode ? 'bg-gray-700' : 'bg-gray-100'
      }`}>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              表示中:
            </span>
            <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {filteredPhrases.length}件
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              ☆ お気に入り:
            </span>
            <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {favorites.size}件
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              カテゴリ:
            </span>
            <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedCategory}
            </span>
          </div>
        </div>
      </div>

      {/* 一括開閉 */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={expandAllVisible}
          disabled={filteredPhrases.length === 0}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          全部を開く
        </button>
        <button
          onClick={collapseAll}
          disabled={filteredPhrases.length === 0}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          全部を閉じる
        </button>
      </div>

      {/* フレーズリスト */}
      <div className="space-y-4">
        {filteredPhrases.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            該当するフレーズが見つかりません
          </div>
        ) : (
          filteredPhrases.map((phrase) => (
            <div
              key={phrase.id}
              className={`border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {phrase.english}
                  </h3>
                  
                  {/* 評価とお気に入り */}
                  <div className="flex flex-col gap-3 mt-2">
                    {/* 既存評価（編集不可） */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        既存評価:
                      </span>
                      <StarRating 
                        rating={phrase.rating} 
                        readonly={true}
                      />
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        ({phrase.ratingCount}件)
                      </span>
                    </div>
                    
                    {/* ユーザー評価（編集可能） */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        あなたの評価:
                      </span>
                      <StarRating 
                        rating={userRatings[phrase.id]?.rating || 0} 
                        onRatingChange={(rating) => addUserRating(phrase.id, rating)}
                        readonly={false}
                      />
                      {userRatings[phrase.id]?.rating && (
                        <button 
                          onClick={() => removeUserRating(phrase.id)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'
                          }`}
                        >
                          削除
                        </button>
                      )}
                    </div>
                    
                    {/* 組み合わせ評価 */}
                    {ratingAggregates[phrase.id] && ratingAggregates[phrase.id].totalUserRatings > 0 && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          総合評価:
                        </span>
                        <StarRating 
                          rating={ratingAggregates[phrase.id].combinedRating} 
                          readonly={true}
                        />
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          ({phrase.ratingCount + ratingAggregates[phrase.id].totalUserRatings}件)
                        </span>
                      </div>
                    )}
                    
                    {/* お気に入りボタン */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFavorite(phrase.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                          favorites.has(phrase.id)
                            ? 'bg-yellow-500 text-white'
                            : darkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {favorites.has(phrase.id) ? '★ お気に入り' : '☆ お気に入りに追加'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => copyToClipboard(phrase.english)}
                  className="text-blue-500 hover:text-blue-700 text-sm font-medium ml-4"
                >
                  コピー
                </button>
              </div>
              
              {!isExpanded(phrase.id) ? (
                <button
                  onClick={() => toggleExpanded(phrase.id)}
                  className={`mt-2 text-sm underline underline-offset-4 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                >
                  日本語と解説を表示（クリックで開く）
                </button>
              ) : (
                <div>
                  <div className="mb-3">
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      <span className="font-medium">日本語:</span> {phrase.japanese}
                    </p>
                  </div>
                  
                  <div className={`p-3 rounded-md mb-3 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      <span className="font-medium">使用場面:</span> {phrase.context}
                    </p>
                  </div>
                  
                  <div className={`p-3 rounded-md border-l-4 border-blue-500 ${
                    darkMode ? 'bg-blue-900' : 'bg-blue-50'
                  }`}>
                    <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                      <span className="font-medium">解決方法:</span> {phrase.solution}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleExpanded(phrase.id)}
                    className={`mt-3 text-sm underline underline-offset-4 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                  >
                    閉じる
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* お問い合わせフォーム */}
      <div className={`mt-12 p-6 rounded-lg border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          お問い合わせ・フィードバック
        </h3>
        

        
        {/* フォームステータス表示 */}
        {formStatus === 'success' && (
          <div className={`mb-4 p-3 rounded-md bg-green-100 border border-green-400 text-green-700`}>
            お問い合わせありがとうございます！送信が完了しました。
          </div>
        )}
        
        {formStatus === 'error' && (
          <div className={`mb-4 p-3 rounded-md bg-red-100 border border-red-400 text-red-700`}>
            送信に失敗しました。もう一度お試しください。
          </div>
        )}
        
        {formStatus === 'rate-limit' && (
          <div className={`mb-4 p-3 rounded-md bg-orange-100 border border-orange-400 text-orange-700`}>
            送信回数が上限に達しました。しばらく時間をおいてから再試行してください。
          </div>
        )}
        
        <form 
          ref={formRef}
          name="contact" 
          method="POST" 
          data-netlify="true" 
          data-netlify-honeypot="bot-field"
          onSubmit={handleFormSubmit}
          className="space-y-4"
        >
          <input type="hidden" name="form-name" value="contact" />
          
          {/* ボット対策フィールド */}
          <div className="hidden">
            <label>Don't fill this out if you're human: <input name="bot-field" /></label>
          </div>
          
          {/* タイムスタンプフィールド */}
          <input type="hidden" name="timestamp" value={Date.now()} />
          
          {/* セッショントークン */}
          <input type="hidden" name="session-token" value={Math.random().toString(36).substring(2)} />
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              minLength="2"
              maxLength="50"
              pattern="[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+"
              title="お名前は2文字以上50文字以下で、使用可能な文字のみ入力してください"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              2文字以上50文字以下、使用可能な文字のみ
            </p>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              required
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
              title="有効なメールアドレスを入力してください"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              件名 <span className="text-red-500">*</span>
            </label>
            <select
              name="subject"
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">選択してください</option>
              <option value="bug">バグ報告</option>
              <option value="feature">機能要望</option>
              <option value="phrase">フレーズの追加・修正</option>
              <option value="other">その他</option>
            </select>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              メッセージ <span className="text-red-500">*</span>
            </label>
            <textarea
              name="message"
              rows="4"
              required
              minLength="10"
              maxLength="1000"
              title="メッセージは10文字以上1000文字以下で入力してください"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="詳細をお聞かせください（10文字以上1000文字以下）..."
            ></textarea>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              10文字以上1000文字以下
            </p>
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting || submitCount >= RATE_LIMIT.maxSubmissions}
            className={`w-full px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              darkMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isSubmitting ? '送信中...' : '送信'}
          </button>
        </form>
      </div>

      {/* フッター */}
      <div className={`mt-8 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <p>フレーズをクリックしてコピーできます</p>
        <p className="mt-2">総フレーズ数: {phrases.length} | 現在のカテゴリ: {filteredPhrases.length}件</p>
        <p className="mt-2">
          <a 
            href="https://github.com/masatoman/code-lingua" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline"
          >
            GitHub
          </a>
          {' | '}
          <a 
            href="mailto:kanon02sky@gmail.com" 
            className="text-blue-500 hover:text-blue-700 underline"
          >
            お問い合わせ
          </a>
        </p>
      </div>
    </div>
  );
};

export default PhraseList;

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, Circle, Trash2, Plus, LogOut, Sparkles, Crown, Zap, RefreshCw } from 'lucide-react';

const supabase = createClient(
  'https://ahexmbykasgvpfceumhs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZXhtYnlrYXNndnBmY2V1bWhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzE5MTIsImV4cCI6MjA3NzI0NzkxMn0.WhSlUYUktgSXQudt5PLrckxGCP-nzUeYgGKj90zAFRk'
);

function TodoApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [substrackReady, setSubstrackReady] = useState(false);

  useEffect(() => {
    checkUser();
    loadSubstrackSDK();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTodos();
      checkSubscription();
    }
  }, [user, substrackReady]);

  const loadSubstrackSDK = () => {
    if (window.Substrack) {
      setSubstrackReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://substrack-yags.vercel.app/substrack-sdk.js';
    script.onload = () => setSubstrackReady(true);
    script.onerror = () => console.error('Failed to load Substrack SDK');
    document.head.appendChild(script);
  };

  const checkSubscription = async () => {
    if (!substrackReady || !window.Substrack) {
      console.log('Substrack not ready');
      return;
    }

    try {
      const substrack = new window.Substrack();
      await substrack.init();
      
      console.log('Substrack initialized');
      
      // Check if user has any subscription
      const hasSubscription = substrack.hasSubscription();
      console.log('Has subscription:', hasSubscription);
      
      if (!hasSubscription) {
        console.log('No subscription found, setting to free');
        setSubscriptionTier('free');
        return;
      }
      
      // Get subscriber info using the correct method
      const subscriber = substrack.getSubscriber();
      console.log('Subscriber info:', subscriber);
      console.log('Subscriber plan:', subscriber?.plan);
      console.log('Subscriber features:', subscriber?.features);
      
      if (subscriber && subscriber.plan) {
        const planId = subscriber.plan;
        console.log('Plan ID:', planId);
        
        // Check against known plan IDs
        if (planId === '1e4c6ca4-dfc1-4dae-9aa7-46cf8c1c6cd2') {
          console.log('Setting tier to: advanced');
          setSubscriptionTier('advanced');
        } else if (planId === '6738763a-a3fd-43e9-869e-6d70cb1794d4') {
          console.log('Setting tier to: pro');
          setSubscriptionTier('pro');
        } else {
          console.log('Unknown plan ID:', planId, '- Setting to free');
          setSubscriptionTier('free');
        }
      } else {
        console.log('No plan info found, setting to free');
        setSubscriptionTier('free');
      }
    } catch (error) {
      console.error('Subscription check error:', error);
      setSubscriptionTier('free');
    }
  };

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user ?? null;
    
    // Clear todos if user changed or logged out
    if (!currentUser || (user && user.id !== currentUser?.id)) {
      setTodos([]);
      setSubscriptionTier('free');
    }
    
    setUser(currentUser);
    setLoading(false);
  };

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching todos:', error);
    } else {
      setTodos(data || []);
    }
  };

  const handleAuth = async () => {
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for verification link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      setEmail('');
      setPassword('');
      checkUser();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTodos([]);
    setSubscriptionTier('free');
    setNewTodo('');
    setEmail('');
    setPassword('');
  };

  const getMaxTodos = () => {
    if (subscriptionTier === 'advanced') return Infinity;
    if (subscriptionTier === 'pro') return 6;
    return 3;
  };

  const addTodo = async () => {
    if (!newTodo.trim()) return;

    const maxTodos = getMaxTodos();
    if (todos.length >= maxTodos) {
      alert(`You've reached your limit of ${maxTodos} todos. Upgrade to add more!`);
      return;
    }

    const { data, error } = await supabase
      .from('todos')
      .insert([{ text: newTodo, user_id: user.id, completed: false }])
      .select();

    if (error) {
      console.error('Error adding todo:', error);
    } else {
      setTodos([data[0], ...todos]);
      setNewTodo('');
    }
  };

  const toggleTodo = async (id, completed) => {
    const { error } = await supabase
      .from('todos')
      .update({ completed: !completed })
      .eq('id', id);

    if (error) {
      console.error('Error updating todo:', error);
    } else {
      setTodos(todos.map(t => t.id === id ? { ...t, completed: !completed } : t));
    }
  };

  const deleteTodo = async (id) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting todo:', error);
    } else {
      setTodos(todos.filter(t => t.id !== id));
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
              TaskFlow
            </h1>
            <p className="text-slate-600">Organize your life, efficiently</p>
          </div>

          <div className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAuth)}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none transition-colors text-sm sm:text-base"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAuth)}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none transition-colors text-sm sm:text-base"
              />
            </div>
            <button
              onClick={handleAuth}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-4 text-emerald-600 hover:text-teal-600 font-medium transition-colors text-sm sm:text-base"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    );
  }

  const maxTodos = getMaxTodos();
  const remainingTodos = maxTodos === Infinity ? '∞' : maxTodos - todos.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                TaskFlow
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-1 break-all">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
            <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg ${
              subscriptionTier === 'advanced' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
              subscriptionTier === 'pro' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
              'bg-slate-200'
            } text-white font-semibold text-sm`}>
              {subscriptionTier === 'advanced' ? <Crown className="w-4 h-4 sm:w-5 sm:h-5" /> :
               subscriptionTier === 'pro' ? <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> :
               <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />}
              <span className={subscriptionTier === 'free' ? 'text-slate-600' : ''}>
                {subscriptionTier === 'advanced' ? 'Advanced Plan' :
                 subscriptionTier === 'pro' ? 'Pro Plan' :
                 'Free Plan'}
              </span>
            </div>
            <div className="px-3 sm:px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-sm">
              {remainingTodos} todos remaining
            </div>
            <button
              onClick={checkSubscription}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm transition-colors"
              title="Refresh subscription status"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {subscriptionTier !== 'advanced' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {subscriptionTier === 'free' && (
              <div
                onClick={() => window.open('https://substrack-yags.vercel.app/subscribe/6738763a-a3fd-43e9-869e-6d70cb1794d4', '_blank')}
                className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-4 sm:p-6 text-white hover:scale-[1.02] transform transition-all duration-300 shadow-xl cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                  <h3 className="text-xl sm:text-2xl font-bold">Pro Plan</h3>
                </div>
                <p className="text-blue-100 mb-3 sm:mb-4 text-sm sm:text-base">Create up to 6 todos</p>
                <div className="bg-white bg-opacity-20 rounded-lg px-3 sm:px-4 py-2 inline-block font-semibold text-sm">
                  Upgrade Now →
                </div>
              </div>
            )}
            <div
              onClick={() => window.open('https://substrack-yags.vercel.app/subscribe/1e4c6ca4-dfc1-4dae-9aa7-46cf8c1c6cd2', '_blank')}
              className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 sm:p-6 text-white hover:scale-[1.02] transform transition-all duration-300 shadow-xl cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
                <h3 className="text-xl sm:text-2xl font-bold">Advanced Plan</h3>
              </div>
              <p className="text-amber-100 mb-3 sm:mb-4 text-sm sm:text-base">Unlimited todos</p>
              <div className="bg-white bg-opacity-20 rounded-lg px-3 sm:px-4 py-2 inline-block font-semibold text-sm">
                Upgrade Now →
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, addTodo)}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:outline-none transition-colors text-sm sm:text-base"
            />
            <button
              onClick={addTodo}
              className="px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Add
            </button>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {todos.map((todo, index) => (
            <div
              key={todo.id}
              className="bg-white rounded-xl shadow-lg p-3 sm:p-4 hover:shadow-xl transform hover:scale-[1.01] transition-all duration-200"
              style={{
                animation: `slideIn 0.3s ease-out ${index * 0.05}s both`
              }}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => toggleTodo(todo.id, todo.completed)}
                  className="flex-shrink-0 text-emerald-500 hover:text-emerald-600 transition-colors"
                >
                  {todo.completed ? (
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <Circle className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </button>
                <span className={`flex-1 text-sm sm:text-base ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'} transition-all break-words`}>
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="flex-shrink-0 text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {todos.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center">
            <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-emerald-500 mb-4 animate-pulse" />
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-700 mb-2">No todos yet</h3>
            <p className="text-slate-500 text-sm sm:text-base">Start by adding your first task above!</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default TodoApp;
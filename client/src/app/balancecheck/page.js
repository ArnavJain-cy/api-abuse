"use client";

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  
  // State variables
  const [showTransactionButton, setShowTransactionButton] = useState(false);
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Get Backend URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // --- 1. Check Balance (Step 1) ---
  const handleCheckBalance = async () => {
    setLoading(true);
    setMsg({ text: '', type: '' });
    setHistory([]); // Clear history if open
    
    try {
      // Calling this endpoint sets the "Safe Flag" in Redis
      const res = await axios.get(`${apiUrl}/api/balance`);
      
      setBalance(res.data.balance); 
      setShowTransactionButton(true); // REVEAL the Transaction button
      setMsg({ text: "Balance verified. Transaction line open.", type: "success" });
    
    } catch (err) {
      setMsg({ text: "Failed to fetch balance.", type: "error" });
    }
    setLoading(false);
  };

  // --- 2. Make Transaction (Step 2) ---
  const handleTransaction = async () => {
    setLoading(true);
    try {
      // This works ONLY if balance was checked recently
      const res = await axios.post(`${apiUrl}/api/transaction`, {
        amount: 100,
        receiver: "Friend"
      });

      setMsg({ 
        text: `✅ Success! Transferred $100. New Balance: $${balance - 100}`, 
        type: "success" 
      });
      
      setBalance(balance - 100); // Update UI
      setShowTransactionButton(false); // Hide button to force re-check (Optional security step)

    } catch (err) {
      // 403 Error means they skipped the flow (or time expired)
      const errorMsg = err.response?.data?.error || "Transaction Failed";
      setMsg({ text: `❌ Blocked: ${errorMsg}`, type: "error" });
    }
    setLoading(false);
  };

  // --- 3. View History ---
  const handleHistory = () => {
     setBalance(null); // Hide balance
     setShowTransactionButton(false); // Hide transaction button
     setMsg({ text: '', type: '' });
     
     // Dummy Data for Demo
     setHistory([
         { id: 1, type: "Sent", amount: "$50", date: "Today" },
         { id: 2, type: "Received", amount: "$200", date: "Yesterday" },
     ]);
  };

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      
      {/* Header */}
      <nav className="flex justify-between items-center mb-10 max-w-2xl mx-auto border-b border-slate-700 pb-4">
        <h1 className="text-2xl font-bold text-blue-400">Sentinel Bank</h1>
        <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white">Logout</button>
      </nav>

      <div className="max-w-xl mx-auto space-y-8">

        {/* --- MAIN BUTTONS --- */}
        <div className="grid grid-cols-2 gap-6">
          <button 
            onClick={handleCheckBalance}
            className="py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95"
          >
            💰 Check Balance
          </button>
          
          <button 
            onClick={handleHistory}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95"
          >
            📜 History
          </button>
        </div>

        {/* --- DISPLAY AREA --- */}
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 min-h-[250px] flex flex-col items-center justify-center text-center">
            
            {loading && <div className="animate-pulse text-blue-300">Processing Secure Request...</div>}

            {/* Message Box */}
            {!loading && msg.text && (
                <div className={`mb-6 px-4 py-3 rounded-lg border w-full ${msg.type === 'error' ? 'bg-red-900/30 border-red-500 text-red-200' : 'bg-green-900/30 border-green-500 text-green-200'}`}>
                    {msg.text}
                </div>
            )}

            {/* BALANCE SCREEN */}
            {!loading && balance !== null && (
                <div className="space-y-6">
                    <div>
                        <p className="text-slate-400 text-sm uppercase tracking-wider">Current Balance</p>
                        <h2 className="text-6xl font-bold text-white mt-2">${balance}</h2>
                    </div>
                    
                    {/* The Transaction Button (Only Visible Here) */}
                    {showTransactionButton && (
                        <button 
                            onClick={handleTransaction}
                            className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-1"
                        >
                            💸 Transfer $100 Now
                        </button>
                    )}
                </div>
            )}

            {/* HISTORY SCREEN */}
            {!loading && history.length > 0 && (
                <div className="w-full">
                    <h3 className="text-xl font-bold mb-4 text-slate-300 text-left">Recent Activity</h3>
                    <div className="space-y-3">
                        {history.map((item) => (
                            <div key={item.id} className="flex justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
                                <span className={item.type === 'Sent' ? 'text-red-400' : 'text-green-400'}>{item.type}</span>
                                <span className="text-slate-400">{item.date}</span>
                                <span className="font-bold text-white">{item.amount}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* EMPTY STATE */}
            {!loading && balance === null && history.length === 0 && (
                <p className="text-slate-500">Select an option above to proceed.</p>
            )}
        </div>

      </div>
    </div>
  );
}
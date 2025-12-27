"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ logs: [], alerts: [] });
  const [showModal, setShowModal] = useState(false);
  const [bannedIPs, setBannedIPs] = useState([]);
  const [loadingIPs, setLoadingIPs] = useState(false);

  const fetchData = async () => {
    try {
      // const res = await axios.get('https://api-abuse-frontend.vercel.app/');

      const res = await axios.get('http://localhost:5000/dashboard/stats');
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Poll every 2 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchBannedIPs = async () => {
    setLoadingIPs(true);
    try {
      const res = await axios.get('http://localhost:5000/dashboard/banned-ips');
      setBannedIPs(res.data.bannedIPs);
    } catch (err) {
      console.error('Error fetching banned IPs:', err);
    } finally {
      setLoadingIPs(false);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    fetchBannedIPs();
  };

  const handleUnbanIP = async (ip) => {
    try {
      await axios.post('http://localhost:5000/dashboard/unban-ip', { ip });
      setBannedIPs(bannedIPs.filter(bannedIP => bannedIP !== ip));
    } catch (err) {
      console.error('Error unbanning IP:', err);
      alert('Failed to unban IP. Please try again.');
    }
  };

  // Process data for Chart (Group logs by time)
  // This is a quick hack to visualize "Requests per update"
  const chartData = data.logs.map((log, index) => ({
    name: index, 
    status: log.status
  })).reverse();

  return (
    <div className="p-10 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-400">Sentinel Protocol Dashboard</h1>
        <button
          onClick={handleOpenModal}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Manage Banned IPs
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        {/* CHART SECTION */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Live Traffic Stream</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="status" stroke="#8884d8" strokeWidth={2} dot={false} />
                <Tooltip />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ALERTS SECTION */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-red-500">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Security Alerts</h2>
          <div className="overflow-y-auto h-64">
            {data.alerts.length === 0 ? <p>No active threats.</p> : (
              data.alerts.map((alert, i) => (
                <div key={i} className="mb-2 p-2 bg-red-900/30 rounded border border-red-500/30">
                  <p className="font-bold">{alert.type}</p>
                  <p className="text-sm text-gray-300">IP: {alert.ip}</p>
                  <p className="text-xs text-gray-400">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RECENT LOGS TABLE */}
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Recent Access Logs</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="p-2">Time</th>
              <th className="p-2">Method</th>
              <th className="p-2">Endpoint</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map((log, i) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700">
                <td className="p-2">{new Date(log.timestamp).toLocaleTimeString()}</td>
                <td className="p-2 font-mono text-yellow-400">{log.method}</td>
                <td className="p-2">{log.endpoint}</td>
                <td className={`p-2 ${log.status >= 400 ? 'text-red-400' : 'text-green-400'}`}>
                  {log.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Banned IPs Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-red-400">Banned IP Addresses</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            {loadingIPs ? (
              <p className="text-gray-400">Loading banned IPs...</p>
            ) : bannedIPs.length === 0 ? (
              <p className="text-gray-400">No IPs are currently banned.</p>
            ) : (
              <div className="space-y-2">
                {bannedIPs.map((ip, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-gray-700 rounded-lg border border-red-500/30"
                  >
                    <span className="font-mono text-yellow-400">{ip}</span>
                    <button
                      onClick={() => handleUnbanIP(ip)}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded transition-colors"
                    >
                      Unban
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
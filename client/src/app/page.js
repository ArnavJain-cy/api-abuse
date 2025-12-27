"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState({ logs: [], alerts: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get('https://api-abuse-frontend.vercel.app/');
      // const res = await axios.get('http://localhost:5000/dashboard/stats');
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

  // Process data for Chart (Group logs by time)
  // This is a quick hack to visualize "Requests per update"
  const chartData = data.logs.map((log, index) => ({
    name: index, 
    status: log.status
  })).reverse();

  return (
    <div className="p-10 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-8 text-blue-400">Sentinel Protocol Dashboard</h1>
      
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
    </div>
  );
}
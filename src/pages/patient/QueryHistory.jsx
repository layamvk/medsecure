import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQueries } from '../../services/queryService';
import StatusBadge from '../../components/StatusBadge';

export default function QueryHistory() {
    const navigate = useNavigate();
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getQueries()
            .then((res) => {
                setQueries(res.data);
            })
            .catch((err) => {
                console.error('Failed to load history:', err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const PriorityBadge = ({ priority }) => {
        let colorClass = 'text-gray-600';
        if (priority === 'high') colorClass = 'text-orange-600 font-bold';
        if (priority === 'critical') colorClass = 'text-red-600 font-bold';
        return <span className={colorClass}>{priority}</span>;
    };

    return (
        <div className="py-6">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">My Query History</h1>
                <button
                    onClick={() => navigate('/patient/new-query')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow"
                >
                    + New Query
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500 animate-pulse">Loading secure medical records...</div>
            ) : queries.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed">
                    <p className="text-gray-500">You have not submitted any queries yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white shadow-md rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query ID / Subject</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {queries.map((query) => (
                                <tr
                                    key={query._id}
                                    onClick={() => navigate(`/patient/queries/${query._id}`)}
                                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">#{query._id.substring(query._id.length - 6)}</div>
                                        <div className="text-sm text-gray-500 truncate max-w-xs">{query.message}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                        {query.category || 'General'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                        <PriorityBadge priority={query.priority} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={query.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(query.createdAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

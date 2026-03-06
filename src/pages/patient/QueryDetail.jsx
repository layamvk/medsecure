import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getQueryById } from '../../services/queryService';
import StatusBadge from '../../components/StatusBadge';

export default function QueryDetail() {
    const { id } = useParams();
    const [query, setQuery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        getQueryById(id)
            .then((res) => {
                setQuery(res.data);
            })
            .catch(() => {
                setError('Failed to load query details. It may not exist or you lack permission.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="py-10 text-center animate-pulse">Loading detailed medical thread...</div>;
    if (error) return <div className="py-10 text-center text-red-600 bg-red-50 p-4 rounded">{error}</div>;
    if (!query) return null;

    return (
        <div className="max-w-4xl mx-auto py-6">
            <Link to="/patient/queries" className="text-sm font-medium text-blue-600 hover:text-blue-500 mb-6 inline-block">
                &larr; Back to Query History
            </Link>

            {/* Query Header Metadata */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8 border border-gray-100">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg leading-6 font-bold text-gray-900">Query Reference: #{query._id.substring(query._id.length - 8)}</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            Submitted on {new Date(query.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <StatusBadge status={query.status} />
                        <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 capitalize border border-gray-200">
                            {query.priority} Priority
                        </span>
                    </div>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Your Medical Inquiry</h4>
                    <p className="text-gray-900 text-lg whitespace-pre-wrap">{query.message}</p>
                </div>

                {/* Attachments Section */}
                {query.attachments && query.attachments.length > 0 && (
                    <div className="border-t border-gray-200 px-4 py-5 sm:px-6 bg-gray-50">
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Medical Attachments</h4>
                        <ul className="border border-gray-200 rounded-md divide-y divide-gray-200 bg-white">
                            {query.attachments.map((file, index) => (
                                <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                    <div className="w-0 flex-1 flex items-center">
                                        <svg className="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                        </svg>
                                        <span className="ml-2 flex-1 w-0 truncate">Attached Document {index + 1} ({file.fileType})</span>
                                    </div>
                                    <div className="ml-4 flex-shrink-0">
                                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-500">
                                            Download
                                        </a>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Responses Timeline */}
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Clinical Responses</h3>

            <div className="space-y-6">
                {(!query.responses || query.responses.length === 0) ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500 italic">
                        Your query is currently in our queue. A medical professional will respond shortly.
                    </div>
                ) : (
                    query.responses.map((response, index) => (
                        <div key={index} className={`rounded-lg p-5 shadow-sm border ${response.responderRole === 'doctor' ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                                <div className="font-bold text-gray-900 flex items-center gap-2">
                                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded capitalize">{response.responderId?.role || 'Staff'} Response</span>
                                    {response.responderId?.name || 'Healthcare Professional'}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(response.createdAt).toLocaleString()}
                                </div>
                            </div>
                            <p className="text-gray-800 whitespace-pre-wrap">{response.message}</p>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}

import { useEffect, useState } from "react";
import { getQueries } from "../services/queryService";

function QueryInbox() {
    const [queries, setQueries] = useState([]);

    useEffect(() => {
        getQueries().then((res) => {
            setQueries(res.data || []);
        }).catch(err => console.error("Failed to load queries:", err));
    }, []);

    return (
        <div>
            <h1 className="text-xl font-bold mb-4">Queries</h1>
            {queries.length === 0 ? (
                <p className="text-gray-600">No queries found.</p>
            ) : (
                <ul className="space-y-4">
                    {queries.map((query) => (
                        <li key={query._id} className="p-4 border rounded shadow-sm">
                            <p className="font-semibold text-blue-600">Query ID: {query._id}</p>
                            <p className="text-gray-800 mt-2">{query.message}</p>
                            <p className="text-sm text-gray-500 mt-1">Status: {query.status}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default QueryInbox;

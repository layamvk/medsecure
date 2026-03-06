import { useParams, Link } from 'react-router-dom';

export default function QueryDetail() {
    const { id } = useParams();

    return (
        <div>
            <Link to="/queries" className="text-sm text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Inbox</Link>
            <h1 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-4">Query Details</h1>

            <div className="bg-gray-50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Viewing Query #{id}</h3>
                <p className="text-gray-600">Patient message, assigned doctors, and AI generated suggestions will load here.</p>
            </div>
        </div>
    );
}

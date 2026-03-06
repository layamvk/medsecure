import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuery } from '../../services/queryService';
import { api } from '../../services/api'; // Needed exclusively for explicit multipart file uploading if required
import toast from 'react-hot-toast';

export default function NewQuery() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        category: 'symptom',
        priority: 'normal',
        message: '',
    });
    const [file, setFile] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Create the query record first
            const res = await createQuery(formData);
            const newQueryId = res.data.query._id;

            // 2. If a file exists, upload it to the newly created Query
            if (file) {
                const fileData = new FormData();
                fileData.append('attachment', file);

                // This specific endpoint requires multipart/form-data
                await api.post(`/queries/${newQueryId}/attachments`, fileData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            // 3. Redirect to the Query History page
            toast.success('Query submitted successfully');
            navigate('/patient/queries');

        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to submit query. Please try again.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-4">Submit a Health Query</h1>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-200">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-sm border border-gray-100 rounded-lg">

                {/* Category */}
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                    </label>
                    <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="symptom">Symptom Assessment</option>
                        <option value="medication">Medication Request/Refill</option>
                        <option value="appointment">Appointment Scheduling</option>
                        <option value="billing">Billing Inquiry</option>
                        <option value="general">General Question</option>
                    </select>
                </div>

                {/* Priority */}
                <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                        Priority Level
                    </label>
                    <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="low">Low (Non-urgent)</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical (Immediate Attention)</option>
                    </select>
                </div>

                {/* Message */}
                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                        Message details
                    </label>
                    <textarea
                        id="message"
                        name="message"
                        rows="5"
                        required
                        value={formData.message}
                        onChange={handleInputChange}
                        className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500 block"
                        placeholder="Please describe your health concern, symptoms, or inquiry..."
                    />
                </div>

                {/* Attachment Upload */}
                <div>
                    <label htmlFor="attachment" className="block text-sm font-medium text-gray-700 mb-1">
                        Attach Medical Record or Image (Optional)
                    </label>
                    <input
                        type="file"
                        id="attachment"
                        name="attachment"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100 border p-2 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Allowed formats: PDF, JPG, PNG. Max 10MB.</p>
                </div>

                {/* Submit */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Submitting secure query...' : 'Submit Query'}
                    </button>
                </div>
            </form>
        </div>
    );
}

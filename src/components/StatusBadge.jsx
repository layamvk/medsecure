// StatusBadge component — no React import needed with JSX transform

const StatusBadge = ({ status }) => {
    const config = {
        open: { label: 'Open', colorStr: 'bg-blue-100 text-blue-700', dot: 'text-blue-500' },
        triaged: { label: 'Triaged', colorStr: 'bg-yellow-100 text-yellow-700', dot: 'text-yellow-500' },
        in_progress: { label: 'In Progress', colorStr: 'bg-purple-100 text-purple-700', dot: 'text-purple-500' },
        responded: { label: 'Responded', colorStr: 'bg-green-100 text-green-700', dot: 'text-green-500' },
        closed: { label: 'Closed', colorStr: 'bg-gray-200 text-gray-600', dot: 'text-gray-400' },
    };

    const current = config[status] || config.open;

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${current.colorStr}`}>
            <svg className={`mr-1.5 h-2 w-2 ${current.dot}`} fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
            </svg>
            {current.label}
        </span>
    );
};

export default StatusBadge;

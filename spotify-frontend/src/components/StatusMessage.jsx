/** Full-height centered message used for loading, error and empty states. */
const StatusMessage = ({ title, children, action }) => (
    <div className="h-full min-h-[50vh] flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
        {title && <h2 className="text-xl font-bold">{title}</h2>}
        {children && <p className="text-gray-400">{children}</p>}
        {action && (
            <button
                onClick={action.onClick}
                className="bg-white text-black font-semibold rounded-full px-6 py-2 cursor-pointer"
            >
                {action.label}
            </button>
        )}
    </div>
);

export default StatusMessage;

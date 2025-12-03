

export default function Placeholder({ title }: { title: string }) {
    return (
        <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-700 mb-4">{title}</h2>
            <div className="p-12 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-400">
                Work in Progress
            </div>
        </div>
    );
}

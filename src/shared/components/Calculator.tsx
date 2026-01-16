import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Plus, Delete } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../context/ThemeContext';

interface CalculatorProps {
    onClose: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
    const { theme } = useTheme();
    const [display, setDisplay] = useState('0');
    // const [memory, setMemory] = useState<number>(0);
    const [waitingForOperand, setWaitingForOperand] = useState(true);
    const [pendingOp, setPendingOp] = useState<string | null>(null);
    const [result, setResult] = useState<number | null>(null);
    // const [isScientfic, setIsScientific] = useState(true);

    // Dragging state
    const [position, setPosition] = useState(() => {
        if (typeof window !== 'undefined') {
            return { x: window.innerWidth - 340, y: window.innerHeight - 500 };
        }
        return { x: 20, y: 80 };
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
    const calculatorRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only drag from the header
        if ((e.target as HTMLElement).closest('.calculator-header')) {
            setIsDragging(true);
            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                initialX: position.x,
                initialY: position.y
            };
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragRef.current) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;

            // Boundary check could be added here
            setPosition({
                x: Math.max(0, dragRef.current.initialX + dx),
                y: Math.max(0, dragRef.current.initialY + dy)
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Calculator Logic
    const inputDigit = (digit: string) => {
        if (waitingForOperand) {
            setDisplay(digit);
            setWaitingForOperand(false);
        } else {
            setDisplay(display === '0' ? digit : display + digit);
        }
    };

    const performOperation = (op: string) => {
        // Scientific functions that execute immediately
        const val = parseFloat(display);

        switch (op) {
            case 'clear':
                setDisplay('0');
                setResult(null);
                setPendingOp(null);
                setWaitingForOperand(true);
                break;
            case 'backspace':
                setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
                break;
            case 'sin':
                // Deg to Rad? Usually calculators toggle. Let's assume Deg for simpler school use or Rad. Standard JS is Rad.
                // Let's implement standard JS Math (Rad) but maybe show explicit DEG/RAD later?
                // Using Radians as default math.
                setDisplay(String(Math.sin(val)));
                setWaitingForOperand(true);
                break;
            case 'cos':
                setDisplay(String(Math.cos(val)));
                setWaitingForOperand(true);
                break;
            case 'tan':
                setDisplay(String(Math.tan(val)));
                setWaitingForOperand(true);
                break;
            case 'log':
                setDisplay(String(Math.log10(val)));
                setWaitingForOperand(true);
                break;
            case 'ln':
                setDisplay(String(Math.log(val)));
                setWaitingForOperand(true);
                break;
            case 'sqrt':
                setDisplay(String(Math.sqrt(val)));
                setWaitingForOperand(true);
                break;
            case 'pow2':
                setDisplay(String(Math.pow(val, 2)));
                setWaitingForOperand(true);
                break;
            case 'pi':
                setDisplay(String(Math.PI));
                setWaitingForOperand(true);
                break;
            case 'e':
                setDisplay(String(Math.E));
                setWaitingForOperand(true);
                break;
            case 'abs':
                setDisplay(String(Math.abs(val)));
                setWaitingForOperand(true);
                break;

            // Binary operations
            case '+':
            case '-':
            case '*':
            case '/':
            case '^':
            case '%':
                if (pendingOp && !waitingForOperand) {
                    calculateResult(op);
                } else {
                    setResult(val);
                    setPendingOp(op);
                    setWaitingForOperand(true);
                }
                break;

            case '=':
                if (pendingOp && result !== null) {
                    calculateResult(null); // Execute pending
                }
                break;
            case '.':
                if (waitingForOperand) {
                    setDisplay('0.');
                    setWaitingForOperand(false);
                } else if (display.indexOf('.') === -1) {
                    setDisplay(display + '.');
                }
                break;
        }
    };

    const calculateResult = (nextOp: string | null) => {
        if (result === null || pendingOp === null) return;

        const current = parseFloat(display);
        let newVal = 0;

        switch (pendingOp) {
            case '+': newVal = result + current; break;
            case '-': newVal = result - current; break;
            case '*': newVal = result * current; break;
            case '/':
                if (current === 0) newVal = NaN;
                else newVal = result / current;
                break;
            case '^': newVal = Math.pow(result, current); break;
            case '%': newVal = result % current; break;
        }

        setDisplay(String(newVal));
        setResult(newVal);
        setPendingOp(nextOp);
        setWaitingForOperand(true);
    };

    const btnClass = "h-10 text-sm font-medium rounded-md flex items-center justify-center transition-all hover:brightness-110 active:scale-95 border border-neutral-200 dark:border-neutral-700 select-none";
    const numBtnClass = cn(btnClass, "bg-neutral-100 dark:bg-neutral-800 text-text dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700");
    const opBtnClass = cn(btnClass, "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-bold");
    const fnBtnClass = cn(btnClass, "bg-neutral-200 dark:bg-neutral-700 text-xs text-neutral-600 dark:text-neutral-300");

    return (
        <div
            ref={calculatorRef}
            className="fixed z-[100] bg-surface/95 backdrop-blur-md border border-neutral-300 dark:border-neutral-600 rounded-xl shadow-2xl overflow-hidden flex flex-col w-[320px] animate-in fade-in zoom-in-95 duration-200"
            style={{ top: position.y, left: position.x }}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div className="calculator-header h-10 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-3 cursor-move group">
                <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                    🖩 Scientific
                </span>
                <button onClick={onClose} className="text-muted hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Display */}
            <div className="p-4 bg-background border-b border-neutral-200 dark:border-neutral-700 text-right">
                <div className="text-xs text-muted h-4">{result !== null && pendingOp ? `${result} ${pendingOp}` : ''}</div>
                <div className="text-2xl font-mono font-bold text-text truncate tracking-wider">{display}</div>
            </div>

            {/* Grid */}
            <div className="p-3 grid grid-cols-5 gap-2" onMouseDown={e => e.stopPropagation()}>
                {/* Row 1 Scientific */}
                <button onClick={() => performOperation('sin')} className={fnBtnClass}>sin</button>
                <button onClick={() => performOperation('cos')} className={fnBtnClass}>cos</button>
                <button onClick={() => performOperation('tan')} className={fnBtnClass}>tan</button>
                <button onClick={() => performOperation('log')} className={fnBtnClass}>log</button>
                <button onClick={() => performOperation('ln')} className={fnBtnClass}>ln</button>

                {/* Row 2 Scientific */}
                <button onClick={() => performOperation('pow2')} className={fnBtnClass}>x²</button>
                <button onClick={() => performOperation('sqrt')} className={fnBtnClass}>√</button>
                <button onClick={() => performOperation('^')} className={fnBtnClass}>xʸ</button>
                <button onClick={() => performOperation('pi')} className={fnBtnClass}>π</button>
                <button onClick={() => performOperation('e')} className={fnBtnClass}>e</button>

                {/* Standard Num Pad + Ops */}
                {/* Row 3 */}
                <button onClick={() => performOperation('clear')} className={cn(fnBtnClass, "col-span-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200")}>AC</button>
                <button onClick={() => performOperation('backspace')} className={fnBtnClass}><Delete className="w-4 h-4" /></button>
                <button onClick={() => performOperation('%')} className={fnBtnClass}>%</button>
                <button onClick={() => performOperation('/')} className={opBtnClass}>÷</button>

                {/* Row 4 */}
                <button onClick={() => inputDigit('7')} className={numBtnClass}>7</button>
                <button onClick={() => inputDigit('8')} className={numBtnClass}>8</button>
                <button onClick={() => inputDigit('9')} className={numBtnClass}>9</button>
                <button onClick={() => performOperation('(')} className={fnBtnClass}>(</button>
                <button onClick={() => performOperation('*')} className={opBtnClass}>×</button>

                {/* Row 5 */}
                <button onClick={() => inputDigit('4')} className={numBtnClass}>4</button>
                <button onClick={() => inputDigit('5')} className={numBtnClass}>5</button>
                <button onClick={() => inputDigit('6')} className={numBtnClass}>6</button>
                <button onClick={() => performOperation(')')} className={fnBtnClass}>)</button>
                <button onClick={() => performOperation('-')} className={opBtnClass}><Minus className="w-4 h-4" /></button>

                {/* Row 6 */}
                <button onClick={() => inputDigit('1')} className={numBtnClass}>1</button>
                <button onClick={() => inputDigit('2')} className={numBtnClass}>2</button>
                <button onClick={() => inputDigit('3')} className={numBtnClass}>3</button>
                <button onClick={() => performOperation('abs')} className={fnBtnClass}>abs</button>
                <button onClick={() => performOperation('+')} className={opBtnClass}><Plus className="w-4 h-4" /></button>

                {/* Row 7 */}
                <button onClick={() => inputDigit('0')} className={cn(numBtnClass, "col-span-2")}>0</button>
                <button onClick={() => performOperation('.')} className={numBtnClass}>.</button>
                <button onClick={() => performOperation('=')} className={cn(opBtnClass, "col-span-2 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25")}>=</button>
            </div>
        </div>
    );
};

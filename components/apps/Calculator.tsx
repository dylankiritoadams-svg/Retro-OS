import React, { useState } from 'react';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

const Button: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className }) => (
    <button
        onClick={onClick}
        className={`bg-gray-200 border-2 border-t-gray-50 border-l-gray-50 border-r-black border-b-black active:border-t-black active:border-l-black active:border-b-gray-50 active:border-r-gray-50 text-2xl font-bold focus:outline-none ${className}`}
    >
        {children}
    </button>
);

export const Calculator: React.FC<AppProps> = () => {
    const [displayValue, setDisplayValue] = useState('0');
    const [operator, setOperator] = useState<string | null>(null);
    const [previousValue, setPreviousValue] = useState<string | null>(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);

    const handleDigitClick = (digit: string) => {
        if (waitingForOperand) {
            setDisplayValue(digit);
            setWaitingForOperand(false);
        } else {
            setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
        }
    };

    const handleDecimalClick = () => {
        if (waitingForOperand) {
            setDisplayValue('0.');
            setWaitingForOperand(false);
            return;
        }
        if (!displayValue.includes('.')) {
            setDisplayValue(displayValue + '.');
        }
    };

    const handleClearClick = () => {
        setDisplayValue('0');
        setOperator(null);
        setPreviousValue(null);
        setWaitingForOperand(false);
    };

    const handleOperatorClick = (nextOperator: string) => {
        const inputValue = parseFloat(displayValue);

        if (previousValue === null) {
            setPreviousValue(String(inputValue));
        } else if (operator) {
            const result = performCalculation();
            setDisplayValue(String(result));
            setPreviousValue(String(result));
        }

        setWaitingForOperand(true);
        setOperator(nextOperator);
    };

    const performCalculation = (): number => {
        const prev = parseFloat(previousValue!);
        const current = parseFloat(displayValue);

        switch (operator) {
            case '+': return prev + current;
            case '-': return prev - current;
            case '*': return prev * current;
            case '/': return prev / current;
            default: return current;
        }
    };

    const handleEqualsClick = () => {
        if (!operator || previousValue === null) return;
        const result = performCalculation();
        setDisplayValue(String(result));
        setPreviousValue(null);
        setOperator(null);
        setWaitingForOperand(true);
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-400 p-2 space-y-2">
            <div className="bg-gray-800 text-white text-right text-4xl p-2 border-2 border-black font-mono overflow-hidden">
                {displayValue}
            </div>
            <div className="grid grid-cols-4 gap-2 flex-grow">
                <Button onClick={handleClearClick} className="col-span-2 bg-red-400">C</Button>
                <Button onClick={() => {}} className="bg-gray-300">%</Button>
                <Button onClick={() => handleOperatorClick('/')} className="bg-orange-400">/</Button>
                
                <Button onClick={() => handleDigitClick('7')}>7</Button>
                <Button onClick={() => handleDigitClick('8')}>8</Button>
                <Button onClick={() => handleDigitClick('9')}>9</Button>
                <Button onClick={() => handleOperatorClick('*')} className="bg-orange-400">x</Button>
                
                <Button onClick={() => handleDigitClick('4')}>4</Button>
                <Button onClick={() => handleDigitClick('5')}>5</Button>
                <Button onClick={() => handleDigitClick('6')}>6</Button>
                <Button onClick={() => handleOperatorClick('-')} className="bg-orange-400">-</Button>
                
                <Button onClick={() => handleDigitClick('1')}>1</Button>
                <Button onClick={() => handleDigitClick('2')}>2</Button>
                <Button onClick={() => handleDigitClick('3')}>3</Button>
                <Button onClick={() => handleOperatorClick('+')} className="bg-orange-400">+</Button>

                <Button onClick={() => handleDigitClick('0')} className="col-span-2">0</Button>
                <Button onClick={handleDecimalClick}>.</Button>
                <Button onClick={handleEqualsClick} className="bg-orange-400">=</Button>
            </div>
        </div>
    );
};

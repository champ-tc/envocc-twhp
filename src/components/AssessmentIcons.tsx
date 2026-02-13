
import React from 'react';
import { Trophy, Star, Shield, Award } from 'lucide-react';

interface GoldShieldProps {
    years?: 3 | 6 | 9;
    size?: number;
    className?: string;
}

export const GoldShield: React.FC<GoldShieldProps> = ({ years, size = 24, className = "" }) => {
    // Base Gold Color
    const goldColor = "text-yellow-500";

    if (!years) {
        return (
            <div className={`relative inline-flex items-center justify-center ${className}`}>
                <Trophy className={`${goldColor} drop-shadow-md`} size={size} />
            </div>
        );
    }

    // Variations for consecutive years
    return (
        <div className={`relative inline-flex items-center justify-center ${className}`} title={`โล่ทองต่อเนื่อง ${years} ปี`}>
            <Trophy className={`${goldColor} drop-shadow-md`} size={size} />
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm flex items-center gap-0.5">
                {years} <span className="text-[8px] font-normal">ปี</span>
            </div>
            {/* Optional: Add stars or other decorations based on years if needed */}
            {years >= 6 && (
                <div className="absolute -bottom-1 -right-1">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                </div>
            )}
            {years >= 9 && (
                <div className="absolute -bottom-1 -left-1">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                </div>
            )}
        </div>
    );
};

export const SilverShield: React.FC<{ size?: number, className?: string }> = ({ size = 24, className = "" }) => (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
        <Trophy className="text-slate-400 drop-shadow-md" size={size} />
    </div>
);

export const CertificateProvincial: React.FC<{ size?: number, className?: string }> = ({ size = 24, className = "" }) => (
    <Award className="text-blue-600 drop-shadow-sm" size={size} />
);

export const CertificateParticipation: React.FC<{ size?: number, className?: string }> = ({ size = 24, className = "" }) => (
    <Award className="text-slate-500 drop-shadow-sm" size={size} />
);

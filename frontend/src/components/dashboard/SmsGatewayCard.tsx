import { MessageSquare } from 'lucide-react';

export default function SmsGatewayCard() {
  return (
    <div className="bg-[#4C469D] text-white p-6 rounded-2xl shadow-sm flex items-center justify-between relative overflow-hidden">
      <div className="space-y-1 max-w-[170px]">
        <h4 className="font-bold text-xs">Free SMS Gateway</h4>
        <p className="text-[10px] opacity-80 leading-tight">
          Send Unlimited Free SMS on Mobile Numbers.
        </p>
      </div>
      <MessageSquare className="w-10 h-10 opacity-70 flex-shrink-0" />
    </div>
  );
}

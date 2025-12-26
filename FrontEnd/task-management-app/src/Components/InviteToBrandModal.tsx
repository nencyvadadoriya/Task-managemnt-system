import { useState } from 'react';
import {
    X,
    Mail,
    Send,
    Loader2,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import type { Brand, BrandInvite, UserType } from '../Types/Types';

interface InviteToBrandModalProps {
    show: boolean;
    brand: Brand;
    currentUser: UserType;
    availableUsers: UserType[];
    onClose: () => void;
    onInvite: (invite: BrandInvite) => void;
}

const InviteToBrandModal: React.FC<InviteToBrandModalProps> = ({
    show,
    brand,
    currentUser,
    availableUsers,
    onClose,
    onInvite,
}) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSendInvite = async () => {
        if (!email.trim()) {
            toast.error('Please enter an email address');
            return;
        }

        if (!validateEmail(email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsSending(true);

        try {
            const inviteData: BrandInvite = {
                email: email.trim(),
                role: 'member', // Fixed: Always set to 'member'
                brandId: brand.id,
                invitedBy: currentUser.id,
                message: message.trim(),
            };

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            onInvite(inviteData);

            // Mock success
            setIsSent(true);
            toast.success(`Invite sent to ${email} successfully!`);

            // Reset form after 2 seconds
            setTimeout(() => {
                handleClose();
            }, 2000);

        } catch (error) {
            console.error('Error sending invite:', error);
            toast.error('Failed to send invite. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        if (!isSending) {
            setEmail('');
            setMessage('');
            setIsSent(false);
            onClose();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isSending && !isSent) {
            handleSendInvite();
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={handleClose}
                />

                {/* Modal */}
                <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg mr-3">
                                <Mail className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Invite to Brand
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {brand.name}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isSending}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {isSent ? (
                            // Success State
                            <div className="text-center py-6">
                                <div className="p-3 bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                    Invite Sent Successfully!
                                </h4>
                                <p className="text-gray-600">
                                    An invitation has been sent to <strong>{email}</strong>
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    They will receive an email with instructions to join the brand.
                                </p>
                            </div>
                        ) : (
                            // Form
                            <div className="space-y-4">
                                {/* Email Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <select
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            disabled={isSending}
                                        >
                                            <option value="">Select member email</option>
                                            {availableUsers
                                                .map(u => u.email)
                                                .filter(Boolean)
                                                .sort((a, b) => a.localeCompare(b))
                                                .map((emailOption) => (
                                                    <option key={emailOption} value={emailOption}>
                                                        {emailOption}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Optional Message */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Personal Message (Optional)
                                    </label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Add a personal message to the invitation..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        disabled={isSending}
                                    />
                                </div>

                                {/* Warning Note */}
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start">
                                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                                        <p className="text-sm text-amber-800">
                                            The invited user will receive an email with a link to join this brand. 
                                            They will need to accept the invitation to access brand resources.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {!isSent && (
                        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                            <button
                                onClick={handleClose}
                                disabled={isSending}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendInvite}
                                disabled={isSending || !email.trim()}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Invite
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InviteToBrandModal;
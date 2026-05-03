import { useState } from 'react'
import { Shield, CheckCircle, XCircle, Scan, QrCode, Link, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'

export default function DigitalVerification() {
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerified, setIsVerified] = useState<null | boolean>(null)

  const handleVerify = () => {
    // Simulate verification
    setIsVerified(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Digital Verification</h1>
        <p className="text-gray-500 mt-1">Verify authenticity of transcripts and certificates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Verify Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Verification Code / QR Code Value</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  placeholder="Enter verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
                <Button onClick={handleVerify}>Verify</Button>
              </div>
            </div>

            <div>
              <Label>OR Upload Document</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mt-1">
                <QrCode className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Upload PDF to extract verification code</p>
                <Button variant="outline" size="sm" className="mt-2">Upload Document</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification Result</CardTitle>
          </CardHeader>
          <CardContent>
            {isVerified === null && (
              <div className="text-center py-8">
                <Scan className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Enter verification code to check authenticity</p>
              </div>
            )}
            {isVerified === true && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-600">Verified!</h3>
                <p className="text-sm text-gray-600 mt-2">This document is authentic and issued by ERP V2 University</p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left text-sm">
                  <p><span className="font-medium">Student:</span> -</p>
                  <p><span className="font-medium">Document ID:</span> -</p>
                  <p><span className="font-medium">Issue Date:</span> -</p>
                  <p><span className="font-medium">Status:</span> <Badge variant="success">Valid</Badge></p>
                </div>
                <Button variant="outline" size="sm" className="mt-4 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download Verification Report
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-500">Total Verifications</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-500">Verified Documents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">0</p>
              <p className="text-sm text-gray-500">Failed Attempts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

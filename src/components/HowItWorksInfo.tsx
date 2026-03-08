import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Cpu, 
  Wifi, 
  Database, 
  Shield, 
  Users, 
  Zap,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function HowItWorksInfo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            How Multi-Device Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="architecture" className="border-none">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  Firebase Data Structure
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-2 pl-6">
                <pre className="bg-muted p-2 rounded-lg overflow-x-auto text-[10px]">
{`ponds/
 ├── pond_001/
 │    ├── ownerId: "user_001"
 │    ├── status/
 │    ├── sensors/
 │    ├── devices/
 │    ├── schedules/
 │    └── access/
 │
 └── pond_002/
      └── ...`}
                </pre>
                <p>Each pond has its own isolated data path. No data mixing between ponds.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="esp32" className="border-none">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-500" />
                  ESP32 Connection
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-2 pl-6">
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Each ESP32 stores its unique Pond ID in flash memory
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Connects ONLY to: <code className="bg-muted px-1 rounded">ponds/[pondId]/*</code>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Cannot read/write to other ponds' paths
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Works independently when offline (cached data)
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="scaling" className="border-none">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Scaling (10,000+ Devices)
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-2 pl-6">
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    No global listeners - app loads only selected pond
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Firebase handles 100,000+ concurrent connections
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Lazy loading: data fetched on-demand
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Each ESP32 operates independently
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security" className="border-none">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  Security & Isolation
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-2 pl-6">
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Firebase Security Rules restrict access by user
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Each pond has access control list (admin/operator/viewer)
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Client A cannot access Client B's ponds
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="roles" className="border-none">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  User Roles
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-2 pl-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Admin (Owner)</span>
                    <span>→ Full access, manage users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Operator</span>
                    <span>→ Control devices, view sensors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Viewer</span>
                    <span>→ Read-only access</span>
                  </div>
                </div>
                <p className="mt-2 pt-2 border-t border-border/50">
                  One user can own multiple ponds. Multiple users can access one pond.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </motion.div>
  );
}

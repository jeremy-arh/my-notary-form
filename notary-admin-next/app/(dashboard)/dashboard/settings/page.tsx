"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SequencesManager from "@/components/settings/SequencesManager";
import GeneralTemplateEditor from "@/components/settings/GeneralTemplateEditor";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Configuration du back-office
        </p>
      </div>

      <Tabs defaultValue="sequences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sequences">Séquences</TabsTrigger>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="integrations">Intégrations</TabsTrigger>
        </TabsList>

        <TabsContent value="sequences">
          <SequencesManager />
        </TabsContent>

        <TabsContent value="general">
          <GeneralTemplateEditor />
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Intégrations</CardTitle>
              <CardDescription>
                SendGrid, Twilio, Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center rounded-lg border border-dashed bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  À venir
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

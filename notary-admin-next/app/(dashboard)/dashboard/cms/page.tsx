"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@iconify/react";
import { BlogArticles } from "@/components/cms/BlogArticles";
import { ServicesList } from "@/components/cms/ServicesList";
import { OptionsList } from "@/components/cms/OptionsList";

export default function CMSPage() {
  const [activeTab, setActiveTab] = useState("blog");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CMS</h1>
        <p className="text-muted-foreground">Gérer le contenu du site</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="blog" className="flex items-center gap-2">
            <Icon icon="lucide:newspaper" className="h-4 w-4" />
            Blog
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Icon icon="lucide:wrench" className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="options" className="flex items-center gap-2">
            <Icon icon="lucide:sliders-horizontal" className="h-4 w-4" />
            Options
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blog">
          <BlogArticles />
        </TabsContent>
        <TabsContent value="services">
          <ServicesList />
        </TabsContent>
        <TabsContent value="options">
          <OptionsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

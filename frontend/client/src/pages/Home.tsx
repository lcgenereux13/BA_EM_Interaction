import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { PagemakingInterface } from "@/components/PagemakingInterface";

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Pagemaking Crew - AI-Powered Document Creation</title>
        <meta name="description" content="Transform your research into polished documents with AI-powered drafting and editing. Watch as analyst and manager agents iteratively create and refine your content." />
        <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
      </Helmet>
      <div className="flex flex-col h-screen">
        <Header />
        <PagemakingInterface />
      </div>
    </>
  );
}

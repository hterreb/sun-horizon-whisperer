import { useEffect } from "react";
import { translate } from "@/i18n";
import { loadLanguage } from "@/utils/language";

const NotFound = () => {
  const language = loadLanguage(navigator.language);
  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      window.location.pathname
    );
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">{translate(language, "notFound.text")}</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          {translate(language, "notFound.home")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;

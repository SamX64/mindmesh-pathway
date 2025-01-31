import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight } from "lucide-react";

const questions = [
  {
    question: "What are your primary learning goals?",
    options: [
      "Improving skills",
      "Preparing for exams",
      "Exploring a new field",
      "Personal growth",
    ],
    key: "learning_goals",
  },
  {
    question: "Which domain are you most interested in?",
    options: [
      "Technical: Coding",
      "Technical: AI/ML",
      "Technical: Cybersecurity",
      "Non-Technical: Marketing",
      "Non-Technical: Content Writing",
      "Non-Technical: Management",
      "Non-Technical: Design",
    ],
    key: "domain_interests",
  },
  {
    question: "What is your preferred learning style?",
    options: [
      "Video tutorials",
      "Interactive quizzes",
      "Reading",
      "Peer-to-peer learning",
    ],
    key: "learning_style",
  },
  {
    question: "How much time can you dedicate to learning daily?",
    options: ["Less than 30 minutes", "1 hour", "2+ hours"],
    key: "daily_time",
    singleSelect: true,
  },
  {
    question: "Are you preparing for any specific certification, exam, or career goal?",
    key: "specific_goals",
    isOptional: true,
    isText: true,
  },
];

const Onboarding = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleOptionToggle = (option: string) => {
    const currentKey = questions[currentQuestion].key;
    if (questions[currentQuestion].singleSelect) {
      setAnswers({ ...answers, [currentKey]: option });
    } else if (!questions[currentQuestion].isText) {
      const currentAnswers = answers[currentKey] || [];
      const updatedAnswers = currentAnswers.includes(option)
        ? currentAnswers.filter((a: string) => a !== option)
        : [...currentAnswers, option];
      setAnswers({ ...answers, [currentKey]: updatedAnswers });
    }
  };

  const handleTextInput = (value: string) => {
    const currentKey = questions[currentQuestion].key;
    setAnswers({ ...answers, [currentKey]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Save onboarding responses
      const { error: responseError } = await supabase
        .from("onboarding_responses")
        .insert([
          {
            user_id: user.id,
            learning_goals: answers.learning_goals || [],
            domain_interests: answers.domain_interests || [],
            learning_style: answers.learning_style || [],
            daily_time: answers.daily_time || "",
            specific_goals: answers.specific_goals || "",
          },
        ]);

      if (responseError) throw responseError;

      // Update onboarding status
      const { error: statusError } = await supabase
        .from("onboarding_status")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (statusError) throw statusError;

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl p-8 space-y-6 animate-fade-up glass rounded-lg">
        <div className="w-full bg-accent/20 h-1 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
        
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Question {currentQuestion + 1} of {questions.length}</h2>
          <p className="text-xl">{currentQ.question}</p>
        </div>

        <div className="space-y-4">
          {currentQ.isText ? (
            <textarea
              className="w-full p-4 rounded-lg bg-background border focus:ring-2 focus:ring-primary"
              rows={4}
              placeholder="Enter your answer (optional)"
              value={answers[currentQ.key] || ""}
              onChange={(e) => handleTextInput(e.target.value)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQ.options.map((option) => (
                <div
                  key={option}
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer"
                  onClick={() => handleOptionToggle(option)}
                >
                  <Checkbox
                    checked={
                      currentQ.singleSelect
                        ? answers[currentQ.key] === option
                        : (answers[currentQ.key] || []).includes(option)
                    }
                    onCheckedChange={() => handleOptionToggle(option)}
                  />
                  <span>{option}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4">
          {currentQuestion > 0 && (
            <Button
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
          )}
          <div className="flex-1" />
          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="flex items-center gap-2"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? "Submitting..." : "Complete"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
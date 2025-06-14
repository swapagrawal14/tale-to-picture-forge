
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";

interface AnalysisResult {
  visualElements: string;
  styleOptions: string[];
  suggestedTitle: string;
}

const Index = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [story, setStory] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('');
  const [editableTitle, setEditableTitle] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [finalTitle, setFinalTitle] = useState('');

  const saveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
  };

  const analyzeStory = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Google AI API key');
      return;
    }
    if (!story.trim()) {
      toast.error('Please enter your story');
      return;
    }

    setIsAnalyzing(true);
    console.log('Starting story analysis...');

    const prompt = `You are an insightful literary analyst and art style consultant. Analyze the following short story/anecdote: "${story}".

1. Identify the 3-4 most important visual elements (characters, setting, key objects, core action/emotion).
2. Suggest 3 distinct illustration styles that would be fitting for this story's mood and content (e.g., 'Whimsical Children's Book', 'Dramatic Graphic Novel Panel', 'Minimalist Line Art', 'Vibrant Watercolor', 'Vintage Storybook', 'Modern Digital Art'). List each style on a new line.
3. Create a short, evocative title (max 5-7 words) for this story snippet.

Structure your response clearly:
VISUAL ELEMENTS: [list the elements]
STYLE OPTIONS:
- [Style 1]
- [Style 2] 
- [Style 3]
TITLE: [suggested title]`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Analysis response:', data);
      
      const aiResponse = data.candidates[0].content.parts[0].text;
      
      // Parse the structured response
      const visualElementsMatch = aiResponse.match(/VISUAL ELEMENTS:\s*(.+?)(?=STYLE OPTIONS:|$)/s);
      const styleOptionsMatch = aiResponse.match(/STYLE OPTIONS:\s*((?:- .+\n?)+)/);
      const titleMatch = aiResponse.match(/TITLE:\s*(.+?)(?=\n|$)/);
      
      const visualElements = visualElementsMatch ? visualElementsMatch[1].trim() : 'Key story elements';
      const styleOptions = styleOptionsMatch 
        ? styleOptionsMatch[1].split('\n').map(line => line.replace(/^- /, '').trim()).filter(Boolean)
        : ['Whimsical Children\'s Book', 'Dramatic Graphic Novel', 'Watercolor Painting'];
      const suggestedTitle = titleMatch ? titleMatch[1].trim() : 'My Story';

      const result = {
        visualElements,
        styleOptions,
        suggestedTitle
      };

      setAnalysisResult(result);
      setSelectedStyle(styleOptions[0] || '');
      setEditableTitle(suggestedTitle);
      toast.success('Story analyzed successfully!');
      
    } catch (error) {
      console.error('Error analyzing story:', error);
      toast.error('Failed to analyze story. Please check your API key and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateIllustration = async () => {
    if (!selectedStyle || !editableTitle) {
      toast.error('Please select a style and confirm the title');
      return;
    }

    setIsGenerating(true);
    console.log('Starting illustration generation...');

    // Create a focused summary for image generation
    const storySummary = story.length > 200 ? story.substring(0, 200) + '...' : story;
    
    const imagePrompt = `Illustrate a key moment from the following story: "${storySummary}".

The main visual elements to include are: ${analysisResult?.visualElements}.

Render this scene in a "${selectedStyle}" illustration style.

Focus on capturing the core emotion and atmosphere of the story. The image should be a single, compelling illustration that brings this story to life. Make it artistic, detailed, and emotionally resonant.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: imagePrompt
            }]
          }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Image generation response:', data);
      
      // Extract the base64 image data
      const imagePart = data.candidates[0].content.parts.find((part: any) => part.inlineData);
      if (imagePart && imagePart.inlineData) {
        const base64Image = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        setGeneratedImage(base64Image);
        setFinalTitle(editableTitle);
        toast.success('Illustration generated successfully!');
      } else {
        throw new Error('No image data in response');
      }
      
    } catch (error) {
      console.error('Error generating illustration:', error);
      toast.error('Failed to generate illustration. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `${finalTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_illustration.png`;
      link.click();
    }
  };

  const resetApp = () => {
    setStory('');
    setAnalysisResult(null);
    setSelectedStyle('');
    setEditableTitle('');
    setGeneratedImage('');
    setFinalTitle('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
            ✨ AI Personal Story Illustrator
          </h1>
          <p className="text-center text-gray-600 mt-2 max-w-2xl mx-auto">
            Transform your personal stories, anecdotes, and memories into beautiful illustrations with the power of AI
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* API Key Section */}
        <Card className="mb-8 border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              🔑 Google AI API Key
            </CardTitle>
            <CardDescription>
              Enter your Google AI API key to enable story analysis and illustration generation.
              <span className="text-orange-600 font-medium"> Your key is stored locally and never shared.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="password"
              placeholder="Enter your Google AI API key..."
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              className="border-orange-200 focus:border-orange-400"
            />
          </CardContent>
        </Card>

        {/* Story Input Section */}
        <Card className="mb-8 border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              📖 Your Story
            </CardTitle>
            <CardDescription>
              Share a personal story, memorable moment, or fictional scene you'd like to see illustrated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Once upon a time, I was walking through the old forest behind my grandmother's house when I discovered a hidden clearing filled with wildflowers. The sunlight filtered through the leaves, creating magical patterns on the ground..."
              value={story}
              onChange={(e) => setStory(e.target.value)}
              className="min-h-32 border-orange-200 focus:border-orange-400"
            />
            <Button 
              onClick={analyzeStory}
              disabled={isAnalyzing || !apiKey || !story}
              className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-medium py-3"
            >
              {isAnalyzing ? 'Analyzing Your Story...' : '🎨 Analyze & Suggest Styles'}
            </Button>
          </CardContent>
        </Card>

        {/* Analysis Results & Style Selection */}
        {analysisResult && (
          <Card className="mb-8 border-orange-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                🎭 Story Analysis & Style Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visual Elements */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Key Visual Elements Identified:</Label>
                <p className="mt-1 p-3 bg-orange-50 border border-orange-200 rounded-md text-gray-700">
                  {analysisResult.visualElements}
                </p>
              </div>

              {/* Title Editor */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">Story Title (editable):</Label>
                <Input
                  id="title"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  className="mt-1 border-orange-200 focus:border-orange-400"
                />
              </div>

              {/* Style Selection */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Choose Illustration Style:</Label>
                <RadioGroup value={selectedStyle} onValueChange={setSelectedStyle}>
                  {analysisResult.styleOptions.map((style, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors">
                      <RadioGroupItem value={style} id={`style-${index}`} className="text-orange-600" />
                      <Label htmlFor={`style-${index}`} className="font-medium cursor-pointer flex-1">
                        {style}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Button 
                onClick={generateIllustration}
                disabled={isGenerating || !selectedStyle}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium py-3"
              >
                {isGenerating ? 'Creating Your Illustration...' : '✨ Illustrate My Story!'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Final Output */}
        {generatedImage && (
          <Card className="mb-8 border-orange-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                🖼️ Your Story Illustration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title Display */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{finalTitle}</h2>
                <p className="text-sm text-gray-600">Illustrated in {selectedStyle} style</p>
              </div>

              {/* Generated Image */}
              <div className="flex justify-center">
                <img 
                  src={generatedImage} 
                  alt={finalTitle}
                  className="max-w-full h-auto rounded-lg shadow-lg border border-orange-200"
                />
              </div>

              {/* Original Story Reference */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Original Story:</Label>
                <p className="mt-1 p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-700 text-sm italic">
                  {story}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={downloadImage}
                  variant="outline"
                  className="flex items-center gap-2 border-orange-200 hover:bg-orange-50"
                >
                  <Download className="w-4 h-4" />
                  Download Illustration
                </Button>
                <Button 
                  onClick={resetApp}
                  variant="outline"
                  className="flex items-center gap-2 border-orange-200 hover:bg-orange-50"
                >
                  <Plus className="w-4 h-4" />
                  Create Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-12">
          <p>✨ Transform your memories into timeless illustrations with AI ✨</p>
          <p className="mt-1">Your API key is stored locally for privacy and security</p>
        </div>
      </div>
    </div>
  );
};

export default Index;

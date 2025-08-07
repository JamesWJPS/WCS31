import React from 'react';
import { Template } from '../../types';
import { Select } from '../ui';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  disabled?: boolean;
  error?: string;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplateId,
  onTemplateChange,
  disabled = false,
  error,
}) => {
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const templateOptions = templates
    .filter(template => template.isActive)
    .map(template => ({
      value: template.id,
      label: template.name,
    }));

  return (
    <div className="template-selector">
      <div className="template-select-wrapper">
        <Select
          value={selectedTemplateId}
          onChange={onTemplateChange}
          options={templateOptions}
          placeholder="Select a template..."
          disabled={disabled}
          error={error}
          aria-label="Content template"
        />
      </div>
      
      {selectedTemplate && (
        <div className="template-preview">
          <h4 className="template-preview-title">Template Preview</h4>
          <div className="template-info">
            <p className="template-description">
              {selectedTemplate.description}
            </p>
            
            <div className="template-features">
              <h5>Accessibility Features:</h5>
              <ul className="features-list">
                {selectedTemplate.accessibilityFeatures.skipLinks && (
                  <li>Skip navigation links</li>
                )}
                {selectedTemplate.accessibilityFeatures.headingStructure && (
                  <li>Proper heading structure</li>
                )}
                {selectedTemplate.accessibilityFeatures.altTextRequired && (
                  <li>Alt text validation for images</li>
                )}
                {selectedTemplate.accessibilityFeatures.colorContrastCompliant && (
                  <li>WCAG color contrast compliance</li>
                )}
              </ul>
            </div>
            
            {selectedTemplate.contentFields.length > 0 && (
              <div className="template-fields">
                <h5>Content Fields:</h5>
                <ul className="fields-list">
                  {selectedTemplate.contentFields.map(field => (
                    <li key={field.id} className="field-item">
                      <span className="field-name">{field.name}</span>
                      <span className="field-type">({field.type})</span>
                      {field.required && (
                        <span className="field-required" aria-label="Required">*</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="template-html-preview">
            <h5>HTML Structure Preview:</h5>
            <div 
              className="html-preview"
              dangerouslySetInnerHTML={{ 
                __html: selectedTemplate.htmlStructure.substring(0, 500) + 
                        (selectedTemplate.htmlStructure.length > 500 ? '...' : '')
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
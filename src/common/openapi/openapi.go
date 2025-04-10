package openapi

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
)

const (
	OAS2        = "2.0"
	OAS3        = "3.0"
	ContentType = "application/json"
)

type OpenAPI struct {
	// oas 2.0 has swagger in the root.
	Swagger    string               `json:"swagger,omitempty"`
	Info       Info                 `json:"info"`
	OpenAPI    string               `json:"openapi,omitempty"`
	Servers    []Server             `json:"servers,omitempty"`
	Paths      map[string]*PathItem `json:"paths"`
	Components Components           `json:"components,omitempty"`
	// oas 2.0 has definitions in the root.
	Definitions map[string]Schema `json:"definitions,omitempty"`
}

func (o *OpenAPI) OASVersion() string {
	if o.Swagger == "2.0" {
		return OAS2
	} else if o.OpenAPI != "" {
		return OAS3
	}
	return ""
}

func (o *OpenAPI) DereferenceSchema(schema Schema) (*Schema, error) {
	if schema.Ref != "" {
		parts := strings.Split(schema.Ref, "/")
		key := parts[len(parts)-1]
		var childSchema Schema
		var ok bool
		switch o.OASVersion() {
		case OAS2:
			childSchema, ok = o.Definitions[key]
			slog.Debug("oasv2.0", "key", key)
			if !ok {
				return nil, fmt.Errorf("schema %q not found", schema.Ref)
			}
		default:
			childSchema, ok = o.Components.Schemas[key]
			if !ok {
				return nil, fmt.Errorf("schema %q not found", schema.Ref)
			}
		}
		return o.DereferenceSchema(childSchema)
	}
	return &schema, nil
}

func (o *OpenAPI) GetSchemaFromResponse(r Response) *Schema {
	switch o.OASVersion() {
	case OAS2:
		return r.Schema
	default:
		ct := r.Content[ContentType]
		return ct.Schema
	}
}

func (o *OpenAPI) GetSchemaFromRequestBody(r RequestBody) *Schema {
	switch o.OASVersion() {
	case OAS2:
		return r.Schema
	default:
		ct := r.Content[ContentType]
		return ct.Schema
	}
}

type Contact struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email,omitempty"`
	URL   string `json:"url,omitempty"`
}

type Server struct {
	URL         string                    `json:"url"`
	Description string                    `json:"description,omitempty"`
	Variables   map[string]ServerVariable `json:"variables,omitempty"`
}

type ServerVariable struct {
	Enum        []string `json:"enum,omitempty"`
	Default     string   `json:"default"`
	Description string   `json:"description,omitempty"`
}

type Info struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Version     string  `json:"version"`
	Contact     Contact `json:"contact,omitempty"`
}

type PathItem struct {
	Get    *Operation `json:"get,omitempty"`
	Patch  *Operation `json:"patch,omitempty"`
	Post   *Operation `json:"post,omitempty"`
	Put    *Operation `json:"put,omitempty"`
	Delete *Operation `json:"delete,omitempty"`
}

type Operation struct {
	Summary     string              `json:"summary,omitempty"`
	Description string              `json:"description,omitempty"`
	OperationID string              `json:"operationId,omitempty"`
	Parameters  []Parameter         `json:"parameters,omitempty"`
	Responses   map[string]Response `json:"responses,omitempty"`
	RequestBody *RequestBody        `json:"requestBody,omitempty"`
}

type Parameter struct {
	Name            string           `json:"name,omitempty"`
	In              string           `json:"in,omitempty"`
	Description     string           `json:"description,omitempty"`
	Required        bool             `json:"required,omitempty"`
	Schema          *Schema          `json:"schema,omitempty"`
	Type            string           `json:"type,omitempty"`
	XAEPResourceRef *XAEPResourceRef `json:"x-aep-resource-reference,omitempty"`
}

type XAEPResourceRef struct {
	Resource string `json:"resource,omitempty"`
}

type Response struct {
	Description string               `json:"description,omitempty"`
	Content     map[string]MediaType `json:"content,omitempty"`
	// oas 2.0 has the schema in the response.
	Schema *Schema `json:"schema,omitempty"`
}

type RequestBody struct {
	Description string               `json:"description,omitempty"`
	Content     map[string]MediaType `json:"content"`
	Required    bool                 `json:"required"`
	// oas 2.0 has the schema in the request body.
	Schema *Schema `json:"schema,omitempty"`
}

type MediaType struct {
	Schema *Schema `json:"schema,omitempty"`
}

type Schema struct {
	Type             string         `json:"type,omitempty"`
	Format           string         `json:"format,omitempty"`
	Items            *Schema        `json:"items,omitempty"`
	Properties       Properties     `json:"properties,omitempty"`
	Ref              string         `json:"$ref,omitempty"`
	XAEPResource     *XAEPResource  `json:"x-aep-resource,omitempty"`
	XAEPFieldNumbers map[int]string `json:"x-aep-field-numbers,omitempty"`
	ReadOnly         bool           `json:"readOnly,omitempty"`
	Required         []string       `json:"required,omitempty"`
	Description      string         `json:"description,omitempty"`
}

type Properties map[string]Schema

type Components struct {
	Schemas map[string]Schema `json:"schemas"`
}

type XAEPResource struct {
	Singular string   `json:"singular,omitempty"`
	Plural   string   `json:"plural,omitempty"`
	Patterns []string `json:"patterns,omitempty"`
	Parents  []string `json:"parents,omitempty"`
}

func FetchOpenAPI(pathOrURL string) (*OpenAPI, error) {
	body, err := readFileOrURL(pathOrURL)
	if err != nil {
		return nil, fmt.Errorf("unable to read file or URL: %w", err)
	}

	var api OpenAPI
	if err := json.Unmarshal(body, &api); err != nil {
		return nil, err
	}

	return &api, nil
}

func readFileOrURL(pathOrURL string) ([]byte, error) {
	if isURL(pathOrURL) {
		resp, err := http.Get(pathOrURL)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		return io.ReadAll(resp.Body)
	}

	return os.ReadFile(pathOrURL)
}

func isURL(str string) bool {
	u, err := url.Parse(str)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https")
}

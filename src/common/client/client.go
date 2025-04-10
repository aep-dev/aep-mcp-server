package client

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/aep-dev/aep-lib-go/pkg/api"
	"github.com/aep-dev/aep-lib-go/pkg/cases"
)

type RequestLoggingFunction func(ctx context.Context, req *http.Request, args ...any)
type ResponseLoggingFunction func(ctx context.Context, resp *http.Response, args ...any)

type Client struct {
	Headers                 map[string]string
	client                  *http.Client
	RequestLoggingFunction  RequestLoggingFunction
	ResponseLoggingFunction ResponseLoggingFunction
}

func NewClient(c *http.Client) *Client {
	return &Client{
		client:  c,
		Headers: make(map[string]string),
		// The basic logging function does not do anything.
		RequestLoggingFunction:  func(ctx context.Context, req *http.Request, args ...any) {},
		ResponseLoggingFunction: func(ctx context.Context, resp *http.Response, args ...any) {},
	}
}

func (c *Client) Create(ctx context.Context, r *api.Resource, serverUrl string, body map[string]interface{}, parameters map[string]string) (map[string]interface{}, error) {
	suffix := ""
	if r.CreateMethod != nil && r.CreateMethod.SupportsUserSettableCreate {
		id, ok := body["id"]
		if !ok {
			return nil, fmt.Errorf("id field not found in %v", body)
		}
		idString, ok := id.(string)
		if ok {
			suffix = fmt.Sprintf("?id=%s", idString)
		}
	}
	url, err := basePath(ctx, r, serverUrl, parameters, suffix)
	if err != nil {
		return nil, err
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("error marshalling JSON: %v", err)
	}

	req, err := c.newRequest(ctx, "POST", url, strings.NewReader(string(jsonBody)))
	if err != nil {
		return nil, fmt.Errorf("error creating POST request: %v", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	return c.parseResponse(ctx, resp)
}

func (c *Client) List(ctx context.Context, r *api.Resource, serverUrl string, parameters map[string]string) ([]map[string]interface{}, error) {
	url, err := basePath(ctx, r, serverUrl, parameters, "")
	if err != nil {
		return nil, err
	}

	req, err := c.newRequest(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating GET request: %v", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}

	m, err := c.parseResponse(ctx, resp)
	if err != nil {
		return nil, err
	}

	kebab := cases.KebabToCamelCase(r.Plural)
	lowerKebab := ""
	if len(kebab) > 1 {
		lowerKebab = strings.ToLower(string(kebab[0])) + kebab[1:]
	}
	for _, key := range []string{"results", r.Plural, cases.KebabToCamelCase(r.Plural), lowerKebab} {
		if val, ok := m[key]; ok {
			if arr, ok := val.([]interface{}); ok {
				var result []map[string]interface{}
				for _, v := range arr {
					if m, ok := v.(map[string]interface{}); ok {
						result = append(result, m)
					}
				}
				return result, nil
			}
		}
	}

	return nil, fmt.Errorf("no valid list key was found")
}

func (c *Client) Get(ctx context.Context, serverUrl string, path string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/%s", serverUrl, strings.TrimPrefix(path, "/"))

	req, err := c.newRequest(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating GET request: %v", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}

	return c.parseResponse(ctx, resp)
}

func (c *Client) Delete(ctx context.Context, serverUrl string, path string) error {
	url := fmt.Sprintf("%s/%s", serverUrl, strings.TrimPrefix(path, "/"))

	req, err := c.newRequest(ctx, "DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("error creating DELETE request: %v", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}

	_, err = c.parseResponse(ctx, resp)
	return err
}

func (c *Client) Update(ctx context.Context, serverUrl string, path string, body map[string]interface{}) error {
	url := fmt.Sprintf("%s/%s", serverUrl, strings.TrimPrefix(path, "/"))

	reqBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("error marshalling JSON for request body: %v", err)
	}

	req, err := c.newRequest(ctx, "PATCH", url, strings.NewReader(string(reqBody)))
	if err != nil {
		return fmt.Errorf("error creating PATCH request: %v", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}

	_, err = c.parseResponse(ctx, resp)
	return err
}

func (c *Client) newRequest(ctx context.Context, method string, url string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, fmt.Errorf("error creating %s request: %v", method, err)
	}
	for key, value := range c.Headers {
		req.Header.Set(key, value)
	}
	c.RequestLoggingFunction(ctx, req)
	return req, nil
}

func (c *Client) parseResponse(ctx context.Context, resp *http.Response) (map[string]interface{}, error) {
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %v", err)
	}

	c.ResponseLoggingFunction(ctx, resp)

	// Empty response means no errors.
	if len(respBody) == 0 {
		return map[string]interface{}{}, nil
	}

	var data map[string]interface{}
	err = json.Unmarshal(respBody, &data)
	if err != nil {
		return nil, err
	}

	err = checkErrors(data)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func checkErrors(resp map[string]interface{}) error {
	e, ok := resp["error"]
	if ok {
		return fmt.Errorf("returned errors, %v", e)
	}
	return nil
}

func basePath(ctx context.Context, r *api.Resource, serverUrl string, parameters map[string]string, suffix string) (string, error) {
	serverUrl = strings.TrimSuffix(serverUrl, "/")
	urlElems := []string{serverUrl}
	for i, elem := range r.PatternElems {
		if i == len(r.PatternElems)-1 {
			continue
		}

		if i%2 == 0 {
			urlElems = append(urlElems, elem)
		} else {
			paramName := elem[1 : len(elem)-1]
			value, ok := parameters[paramName]
			if !ok {
				return "", fmt.Errorf("parameter %s not found in parameters %v", paramName, parameters)
			}

			if strings.Contains(value, "/") {
				value = strings.Split(value, "/")[len(strings.Split(value, "/"))-1]
			}
			urlElems = append(urlElems, value)
		}
	}
	result := strings.Join(urlElems, "/")
	if suffix != "" {
		result = result + suffix
	}
	return result, nil
}
